"use server";

import { db } from "@/lib/db";
import {
  leaveRequests,
  leaveTypes,
  leaveBalances,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
// Server actions check revocation and deactivation too (SEC-0007).
import { liveAuth as auth } from "@/lib/auth/live-session";
import { logger } from "@/lib/logger";
import {
  DEFAULT_LEAVE_TYPES,
  LEAVE_POLICY,
  ALLOWED_LEAVE_TYPE_NAMES,
  resolveInitialBalance,
} from "@/lib/leave-policy";
import { calculateLeaveWorkingDays } from "@/lib/validations/leave-request";
import { countLeaveWorkingDays } from "@/lib/hr/leave-working-days-server";
import {
  casualMaxUsableInMonth,
  monthBoundsYyyyMm,
  monthsSpannedByDateRange,
  previousCalendarMonth,
} from "@/lib/hr/casual-leave-monthly";

export async function ensureLeaveTypes(orgId: string) {
  const types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  const existingNames = new Set(types.map((t) => t.name));
  const missing = DEFAULT_LEAVE_TYPES.filter((t) => !existingNames.has(t.name));

  // R3-0105: the common case is that nothing is missing, so return the rows
  // already in hand instead of inserting nothing and reading them again.
  if (missing.length === 0) return types;

  await db.insert(leaveTypes).values(
    missing.map((t) => ({
      orgId,
      name: t.name,
      daysPerYear: t.daysPerYear,
      carryForward: t.carryForward,
    })),
  );

  return db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });
}

/**
 * Paid days of leave already approved in `year`, by leave type. Approval only
 * deducts from a balance row that exists, so leave approved before the row was
 * seeded was never taken off: Who's Out listed it while the balance read
 * "12 of 12, 0 used" (R2-HR-10). A row seeded late starts net of these.
 */
async function approvedPaidDaysByType(
  orgId: string,
  userId: string,
  year: number,
): Promise<Map<number, number>> {
  const approved = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.orgId, orgId),
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "APPROVED"),
      gte(leaveRequests.startDate, `${year}-01-01`),
      lte(leaveRequests.startDate, `${year}-12-31`),
    ),
    columns: { leaveTypeId: true, startDate: true, endDate: true, isHalfDay: true, lopDays: true },
  });
  const byType = new Map<number, number>();
  for (const r of approved) {
    if (r.leaveTypeId == null) continue;
    const days = await countLeaveWorkingDays({ orgId, startDate: r.startDate, endDate: r.endDate, isHalfDay: r.isHalfDay });
    const paid = Math.max(0, days - Number(r.lopDays ?? 0));
    byType.set(r.leaveTypeId, (byType.get(r.leaveTypeId) ?? 0) + paid);
  }
  return byType;
}

export async function ensureUserBalances(
  orgId: string,
  userId: string,
  types: { id: number; name: string; daysPerYear: number }[],
) {
  const year = new Date().getFullYear();

  const existing = await db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, year),
    ),
  });

  const existingTypeIds = new Set(existing.map((b) => b.leaveTypeId));
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { joiningDate: true },
  });
  const joiningDate = user?.joiningDate ? new Date(user.joiningDate) : new Date(year, 0, 1);
  const missingTypes = types.filter((t) => !existingTypeIds.has(t.id));
  if (missingTypes.length === 0) return;
  const alreadyTaken = await approvedPaidDaysByType(orgId, userId, year);

  for (const t of missingTypes) {
    const balance = Math.max(
      0,
      resolveInitialBalance(t.name, t.daysPerYear, joiningDate, year) - (alreadyTaken.get(t.id) ?? 0),
    );

    await db.insert(leaveBalances).values({
      orgId,
      userId,
      leaveTypeId: t.id,
      year,
      balance: balance.toString(),
    }).onConflictDoNothing(); // a racing request may have seeded it first
  }
}

export async function initializeLeaveBalances(
  orgId: string,
  userId: string,
  joiningDate: Date | string,
) {
  const types = await ensureLeaveTypes(orgId);
  const joinDate = typeof joiningDate === "string" ? new Date(joiningDate) : joiningDate;
  const currentYear = new Date().getFullYear();
  const targetYear = Math.max(joinDate.getFullYear(), currentYear);

  const existingBalances = await db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, targetYear),
    ),
  });
  const existingTypeIds = new Set(existingBalances.map((b) => b.leaveTypeId));
  const missingTypes = types.filter((type) => !existingTypeIds.has(type.id));
  const alreadyTaken =
    missingTypes.length > 0 ? await approvedPaidDaysByType(orgId, userId, targetYear) : new Map<number, number>();

  const toInsert = missingTypes.map((type) => ({
    orgId,
    userId,
    leaveTypeId: type.id,
    year: targetYear,
    balance: Math.max(
      0,
      resolveInitialBalance(type.name, type.daysPerYear, joinDate, targetYear) - (alreadyTaken.get(type.id) ?? 0),
    ).toString(),
  }));

  if (toInsert.length > 0) {
    try {
      // Rows a concurrent seeder already inserted are skipped by the unique index.
      await db.insert(leaveBalances).values(toInsert).onConflictDoNothing();
    } catch (err) {
      logger.error("Failed to insert leave balance rows", err);
    }
  }
}

/** Sum approved/pending casual working days for a user clipped to a YYYY-MM month. */
export async function countCasualLeaveDaysInMonth(params: {
  orgId: string;
  userId: string;
  casualTypeId: number;
  yyyyMm: string;
  statuses?: Array<"PENDING" | "APPROVED">;
}): Promise<number> {
  const { start, end } = monthBoundsYyyyMm(params.yyyyMm);
  const statuses = params.statuses ?? ["PENDING", "APPROVED"];
  const rows = await db
    .select({
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      isHalfDay: leaveRequests.isHalfDay,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.orgId, params.orgId),
        eq(leaveRequests.userId, params.userId),
        eq(leaveRequests.leaveTypeId, params.casualTypeId),
        inArray(leaveRequests.status, statuses),
        lte(leaveRequests.startDate, end),
        gte(leaveRequests.endDate, start),
      ),
    );

  let total = 0;
  for (const r of rows) {
    const reqStart = r.startDate.slice(0, 10);
    const reqEnd = r.endDate.slice(0, 10);
    const clipStart = reqStart > start ? reqStart : start;
    const clipEnd = reqEnd < end ? reqEnd : end;
    if (clipStart > clipEnd) continue;
    total += calculateLeaveWorkingDays({
      startDate: clipStart,
      endDate: clipEnd,
      isHalfDay: r.isHalfDay ?? false,
    });
  }
  return total;
}

/**
 * Enforces casual leave monthly cap: accrual + at most 1 month carry (max 2 days).
 * Returns an error message when the request would exceed the cap.
 */
export async function getCasualMonthlyCapError(params: {
  orgId: string;
  userId: string;
  casualTypeId: number;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}): Promise<string | null> {
  const start = params.startDate.slice(0, 10);
  const end = params.endDate.slice(0, 10);
  const months = monthsSpannedByDateRange(start, end);

  for (const yyyyMm of months) {
    const [yStr, mStr] = yyyyMm.split("-");
    const year = Number(yStr);
    const monthIndex0 = Number(mStr) - 1;
    const prev = previousCalendarMonth(year, monthIndex0);

    const [usedInMonth, usedInPrev, bounds] = await Promise.all([
      countCasualLeaveDaysInMonth({
        orgId: params.orgId,
        userId: params.userId,
        casualTypeId: params.casualTypeId,
        yyyyMm,
      }),
      countCasualLeaveDaysInMonth({
        orgId: params.orgId,
        userId: params.userId,
        casualTypeId: params.casualTypeId,
        yyyyMm: prev.yyyyMm,
      }),
      Promise.resolve(monthBoundsYyyyMm(yyyyMm)),
    ]);

    const clipStart = start > bounds.start ? start : bounds.start;
    const clipEnd = end < bounds.end ? end : bounds.end;
    const requestedInMonth = calculateLeaveWorkingDays({
      startDate: clipStart,
      endDate: clipEnd,
      isHalfDay: params.isHalfDay && start === end,
    });
    if (requestedInMonth <= 0) continue;

    const maxUsable = casualMaxUsableInMonth(usedInPrev);
    if (usedInMonth + requestedInMonth > maxUsable + 1e-9) {
      return (
        `Casual leave is limited to ${maxUsable} day(s) in ${yyyyMm} ` +
        `(1 earned this month` +
        (maxUsable > LEAVE_POLICY.CASUAL.perMonth
          ? " + 1 carried from last month"
          : ", no carry from last month") +
        `). Already used/requested: ${usedInMonth}, this request adds: ${requestedInMonth}.`
      );
    }
  }

  return null;
}

export async function getLeaveContext() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });
  if (!member) return { error: "No organization found" };

  const types = await ensureLeaveTypes(member.orgId);
  const allowedTypes = types.filter((t) => ALLOWED_LEAVE_TYPE_NAMES.has(t.name));
  const seenTypeNames = new Set<string>();
  const filteredTypes = allowedTypes.filter((t) => {
    if (seenTypeNames.has(t.name)) return false;
    seenTypeNames.add(t.name);
    return true;
  });
  await ensureUserBalances(member.orgId, session.user.id, filteredTypes);

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { joiningDate: true },
  });
  const joiningDate = user?.joiningDate ? new Date(user.joiningDate).toISOString() : null;

  const rawBalances = await db
    .select({
      id: leaveBalances.id,
      leaveTypeId: leaveBalances.leaveTypeId,
      balance: leaveBalances.balance,
      typeName: leaveTypes.name,
      daysPerYear: leaveTypes.daysPerYear,
    })
    .from(leaveBalances)
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(leaveBalances.userId, session.user.id),
        eq(leaveBalances.year, new Date().getFullYear()),
      ),
    );

  const allowedBalances = rawBalances.filter((b) => b.typeName && ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName));
  const seenNames = new Set<string>();
  const balances = allowedBalances.filter((b) => {
    if (!b.typeName || seenNames.has(b.typeName)) return false;
    seenNames.add(b.typeName);
    return true;
  });

  return { success: true, balances, types: filteredTypes, joiningDate };
}
