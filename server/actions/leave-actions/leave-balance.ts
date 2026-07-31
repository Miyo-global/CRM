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
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  DEFAULT_LEAVE_TYPES,
  LEAVE_POLICY,
  ALLOWED_LEAVE_TYPE_NAMES,
  resolveInitialBalance,
} from "@/lib/leave-policy";
import { calculateLeaveWorkingDays } from "@/lib/validations/leave-request";

export async function ensureLeaveTypes(orgId: string) {
  let types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  if (types.length === 0) {

    for (const t of DEFAULT_LEAVE_TYPES) {
      await db.insert(leaveTypes).values({
        orgId,
        name: t.name,
        daysPerYear: t.daysPerYear,
        carryForward: t.carryForward,
      });
    }
  } else {

    const existingNames = new Set(types.map((t) => t.name));
    for (const t of DEFAULT_LEAVE_TYPES) {
      if (!existingNames.has(t.name)) {
        await db.insert(leaveTypes).values({
          orgId,
          name: t.name,
          daysPerYear: t.daysPerYear,
          carryForward: t.carryForward,
        });
      }
    }
  }

  types = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  return types;
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

  for (const t of types) {
    if (existingTypeIds.has(t.id)) continue;

    const balance = resolveInitialBalance(t.name, t.daysPerYear, joiningDate, year);

    await db.insert(leaveBalances).values({
      orgId,
      userId,
      leaveTypeId: t.id,
      year,
      balance: balance.toString(),
    });
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

  const toInsert = types
    .filter((type) => !existingTypeIds.has(type.id))
    .map((type) => ({
      orgId,
      userId,
      leaveTypeId: type.id,
      year: targetYear,
      balance: resolveInitialBalance(type.name, type.daysPerYear, joinDate, targetYear).toString(),
    }));

  if (toInsert.length > 0) {
    try {
      await db.insert(leaveBalances).values(toInsert);
    } catch (err) {
      logger.error("Failed bulk leave balance insert; retrying per row", err);
      for (const row of toInsert) {
        try {
          await db.insert(leaveBalances).values(row);
        } catch (rowErr) {
          logger.error("Failed to insert leave balance row", rowErr);
        }
      }
    }
  }
}

export async function expireUnusedMonthlyCasualLeaves() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const monthNum = String(prevMonth + 1).padStart(2, "0");
  const lastDay = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
  const monthStartStr = `${prevMonthYear}-${monthNum}-01`;
  const monthEndStr = `${prevMonthYear}-${monthNum}-${String(lastDay).padStart(2, "0")}`;
  const orgs = await db
    .selectDistinct({ orgId: leaveBalances.orgId })
    .from(leaveBalances)
    .where(eq(leaveBalances.year, prevMonthYear));

  let expiredCount = 0;

  const casualTypes = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.name, LEAVE_POLICY.CASUAL.name),
  });

  if (casualTypes.length === 0) return { expiredCount: 0 };

  const orgCasualMap = new Map(casualTypes.map((ct) => [ct.orgId, ct]));
  const casualTypeIds = casualTypes.map((ct) => ct.id);

  const allBalances = await db.query.leaveBalances.findMany({
    where: and(
      inArray(leaveBalances.leaveTypeId, casualTypeIds),
      eq(leaveBalances.year, prevMonthYear),
    ),
  });

  const positiveBalances = allBalances.filter((b) => Number(b.balance) > 0);
  if (positiveBalances.length === 0) return { expiredCount: 0 };

  const usedRequests = await db
    .select({
      userId: leaveRequests.userId,
      leaveTypeId: leaveRequests.leaveTypeId,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      isHalfDay: leaveRequests.isHalfDay,
    })
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.leaveTypeId, casualTypeIds),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, monthEndStr!),
        gte(leaveRequests.endDate, monthStartStr!),
      ),
    );

  const usedDaysMap = new Map<string, number>();
  for (const r of usedRequests) {
    const reqStart = r.startDate.slice(0, 10);
    const reqEnd = r.endDate.slice(0, 10);
    const clipStart = reqStart > monthStartStr! ? reqStart : monthStartStr!;
    const clipEnd = reqEnd < monthEndStr! ? reqEnd : monthEndStr!;
    const days = calculateLeaveWorkingDays({
      startDate: clipStart,
      endDate: clipEnd,
      isHalfDay: r.isHalfDay ?? false,
    });
    const key = `${r.userId}:${r.leaveTypeId}`;
    usedDaysMap.set(key, (usedDaysMap.get(key) ?? 0) + days);
  }

  for (const bal of positiveBalances) {
    const casualType = orgCasualMap.get(bal.orgId);
    if (!casualType || bal.leaveTypeId !== casualType.id) continue;

    const usedDays = usedDaysMap.get(`${bal.userId}:${bal.leaveTypeId}`) ?? 0;
    const expiring = Math.max(0, LEAVE_POLICY.CASUAL.perMonth - usedDays);
    if (expiring <= 0) continue;

    const newBalance = Math.max(0, Number(bal.balance) - expiring);
    await db
      .update(leaveBalances)
      .set({ balance: newBalance.toString() })
      .where(eq(leaveBalances.id, bal.id));
    expiredCount++;
  }

  return { expiredCount };
}

export async function resetYearlyLeaveBalances() {
  const newYear = new Date().getFullYear();

  const orgs = await db
    .selectDistinct({ orgId: leaveTypes.orgId })
    .from(leaveTypes);

  let resetCount = 0;

  for (const { orgId } of orgs) {
    const types = await ensureLeaveTypes(orgId);
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: { columns: { id: true, joiningDate: true, isActive: true } } },
    });

    const activeMembers = members.filter((m) => m.user?.isActive);
    if (activeMembers.length === 0 || types.length === 0) continue;

    const existingBalances = await db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.orgId, orgId),
        eq(leaveBalances.year, newYear),
      ),
    });
    const existingSet = new Set(
      existingBalances.map((b) => `${b.userId}:${b.leaveTypeId}`)
    );

    const toInsert: typeof leaveBalances.$inferInsert[] = [];
    for (const member of activeMembers) {
      const joiningDate = member.user?.joiningDate
        ? new Date(member.user.joiningDate)
        : new Date();

      for (const type of types) {
        if (existingSet.has(`${member.userId}:${type.id}`)) continue;
        const balance = resolveInitialBalance(type.name, type.daysPerYear, joiningDate, newYear);
        toInsert.push({
          orgId,
          userId: member.userId,
          leaveTypeId: type.id,
          year: newYear,
          balance: balance.toString(),
        });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(leaveBalances).values(toInsert).onConflictDoNothing();
      resetCount += toInsert.length;
    }
  }

  return { resetCount };
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
