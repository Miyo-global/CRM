"use server";

import { db } from "@/lib/db";
import {
  attendance,
  leaveRequests,
  wfhRequests,
  holidays,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { createNotification, notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import { sendTemplateEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";
import { ATTENDANCE_EXEMPT_ROLES } from "@/lib/constants/roles";

const ABSENT_CUTOFF_LABEL = "11:59 AM IST";

function todayIstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
}

function istDayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function displayName(u: { name: string | null; firstName: string | null; lastName: string | null }): string {
  if (u.name && u.name.trim()) return u.name.trim();
  const composed = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return composed || "Employee";
}

export async function markAbsentEmployeesAsLeave() {
  const today = todayIstYmd();

  if (istDayOfWeek(today) === 0) {
    return { processed: 0, date: today, message: "Weekly off (Sunday) — skipped" };
  }

  const orgs = await db
    .selectDistinct({ orgId: organizationMembers.orgId })
    .from(organizationMembers);

  let totalMarked = 0;
  const perOrg: { orgId: string; marked: number }[] = [];

  for (const { orgId } of orgs) {
    const holidayToday = await db
      .select({ id: holidays.id })
      .from(holidays)
      .where(
        and(eq(holidays.orgId, orgId), eq(holidays.date, today), eq(holidays.isHalfDay, false)),
      )
      .limit(1);
    if (holidayToday.length > 0) {
      perOrg.push({ orgId, marked: 0 });
      continue;
    }

    const members = await db
      .select({
        userId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        joiningDate: users.joiningDate,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));

    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) {
      perOrg.push({ orgId, marked: 0 });
      continue;
    }

    const [attendanceRows, leaveRows, wfhRows] = await Promise.all([
      db
        .select({ userId: attendance.userId, checkIn: attendance.checkIn })
        .from(attendance)
        .where(
          and(
            eq(attendance.orgId, orgId),
            eq(attendance.date, today),
            inArray(attendance.userId, memberIds),
          ),
        ),
      db
        .select({ userId: leaveRequests.userId })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.orgId, orgId),
            inArray(leaveRequests.userId, memberIds),
            inArray(leaveRequests.status, ["PENDING", "APPROVED"]),
            lte(leaveRequests.startDate, today),
            gte(leaveRequests.endDate, today),
          ),
        ),
      db
        .select({ userId: wfhRequests.userId })
        .from(wfhRequests)
        .where(
          and(
            eq(wfhRequests.orgId, orgId),
            inArray(wfhRequests.userId, memberIds),
            eq(wfhRequests.status, "APPROVED"),
            eq(wfhRequests.date, today),
          ),
        ),
    ]);

    const hasAttendanceRow = new Set(attendanceRows.map((r) => r.userId));
    const checkedIn = new Set(
      attendanceRows.filter((r) => r.checkIn != null).map((r) => r.userId),
    );
    const onLeave = new Set(leaveRows.map((r) => r.userId));
    const onWfh = new Set(wfhRows.map((r) => r.userId));

    const absentees = members.filter((m) => {
      // Roles whose attendance is not enforced are never marked absent and
      // never appear in the HR digest — an Admin was being listed as absent
      // without leave every day (QA-0042). They still receive the digest.
      if (ATTENDANCE_EXEMPT_ROLES.includes(m.role)) return false;
      if (checkedIn.has(m.userId) || onLeave.has(m.userId) || onWfh.has(m.userId)) return false;
      if (m.joiningDate && m.joiningDate > today) return false;
      return true;
    });

    if (absentees.length === 0) {
      perOrg.push({ orgId, marked: 0 });
      continue;
    }

    const toInsert = absentees
      .filter((m) => !hasAttendanceRow.has(m.userId))
      .map((m) => ({ orgId, userId: m.userId, date: today, status: "ABSENT" }));
    if (toInsert.length > 0) {
      try {
        await db.insert(attendance).values(toInsert);
      } catch (error) {
        logger.error("Failed to insert auto-absent attendance rows", error);
      }
    }

    const names: string[] = [];
    for (const m of absentees) {
      const name = displayName(m);
      names.push(name);
      try {
        await createNotification({
          orgId,
          userId: m.userId,
          type: "WARNING",
          title: "Marked absent — treated as leave",
          message: `You were not checked in by ${ABSENT_CUTOFF_LABEL} on ${today} and have no approved leave for the day, so it is being counted as leave. Tell HR if that is wrong.`,
          link: "/hr/attendance",
        });
        if (m.email) {
          // MIYO-0147: the hand-written attendance-auto-absent template,
          // rather than the generic notification wrapper.
          await sendTemplateEmail("attendance-auto-absent", {
            to: m.email,
            vars: { date: today, marked_as: "absent, counted as leave" },
          });
        }
      } catch (error) {
        logger.error("Failed to notify absent employee", { userId: m.userId, error });
      }
    }

    try {
      await notifyByRoles(orgId, [ROLES.CEO, ROLES.HR], {
        type: "WARNING",
        title: `Absent without leave — ${today}`,
        message: `${absentees.length} ${absentees.length === 1 ? "person" : "people"} were not checked in by ${ABSENT_CUTOFF_LABEL} on ${today} and have no approved leave, so the day counts as leave for them:\n${names.join(", ")}`,
        link: "/hr/attendance",
        email: true,
      });
    } catch (error) {
      logger.error("Failed to notify HR/CEO of absentees", error);
    }

    totalMarked += absentees.length;
    perOrg.push({ orgId, marked: absentees.length });
  }

  return { processed: totalMarked, date: today, perOrg };
}
