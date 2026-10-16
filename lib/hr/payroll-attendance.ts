import "server-only";

import { db } from "@/lib/db";
import { attendance, holidays, leaveRequests, leaveTypes, resignations, users } from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, isNotNull } from "drizzle-orm";
import {
  calendarDaysInMonth,
  computeStrictAttendance,
  type LeaveCoverage,
  type StrictAttendanceResult,
} from "./payroll-calculations";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import {
  casualMaxUsableInMonth,
  monthBoundsYyyyMm,
  previousCalendarMonth,
} from "@/lib/hr/casual-leave-monthly";
import { calculateLeaveWorkingDays } from "@/lib/validations/leave-request";
import { employmentWindow } from "@/lib/payroll/rules";

function monthBounds(month: string): { start: string; end: string } {
  const calDays = calendarDaysInMonth(month);
  return { start: `${month}-01`, end: `${month}-${String(calDays).padStart(2, "0")}` };
}

function todayIstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
}

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  for (let d = s; d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function getStrictPayrollAttendanceBatch(
  orgId: string,
  userIds: string[],
  month: string,
  /**
   * Optional cap (YYYY-MM-DD) for how far into the month to evaluate. Defaults
   * to today (IST). Used by custom-period payroll so a window that ends before
   * month-end is not docked as loss-of-pay for the remaining days.
   */
  evaluateThrough?: string,
): Promise<Map<string, StrictAttendanceResult>> {
  const result = new Map<string, StrictAttendanceResult>();
  if (userIds.length === 0) return result;

  const { start, end } = monthBounds(month);
  const today = todayIstYmd();
  const through =
    evaluateThrough && evaluateThrough >= start
      ? evaluateThrough < today
        ? evaluateThrough
        : today
      : today;

  const [yearStr, monthStr] = month.split("-");
  const prev = previousCalendarMonth(Number(yearStr), Number(monthStr) - 1);
  const prevBounds = monthBoundsYyyyMm(prev.yyyyMm);

  const [attendanceRows, holidayRows, leaveRows, casualType, prevCasualRows, employeeRows, exitRows] =
    await Promise.all([
    db
      .select({
        userId: attendance.userId,
        date: attendance.date,
        workHours: attendance.workHours,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.orgId, orgId),
          inArray(attendance.userId, userIds),
          gte(attendance.date, start),
          lte(attendance.date, end),
          isNotNull(attendance.checkIn),
        ),
      ),
    db
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(eq(holidays.orgId, orgId), gte(holidays.date, start), lte(holidays.date, end))),
    db
      .select({
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        isHalfDay: leaveRequests.isHalfDay,
        typeName: leaveTypes.name,
        typeDaysPerYear: leaveTypes.daysPerYear,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveTypes.id, leaveRequests.leaveTypeId))
      .where(
        and(
          eq(leaveRequests.orgId, orgId),
          inArray(leaveRequests.userId, userIds),
          // Only approved leave changes pay; pending/rejected days are plain absences.
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, end),
          gte(leaveRequests.endDate, start),
        ),
      ),
    db.query.leaveTypes.findFirst({
      where: and(eq(leaveTypes.orgId, orgId), eq(leaveTypes.name, LEAVE_POLICY.CASUAL.name)),
      columns: { id: true },
    }),
    db
      .select({
        userId: leaveRequests.userId,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        isHalfDay: leaveRequests.isHalfDay,
        leaveTypeId: leaveRequests.leaveTypeId,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, orgId),
          inArray(leaveRequests.userId, userIds),
          eq(leaveRequests.status, "APPROVED"),
          lte(leaveRequests.startDate, prevBounds.end),
          gte(leaveRequests.endDate, prevBounds.start),
        ),
      ),
    db
      .select({ id: users.id, joiningDate: users.joiningDate })
      .from(users)
      .where(inArray(users.id, userIds)),
    db
      .select({ userId: resignations.userId, lastWorkingDate: resignations.lastWorkingDate })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, orgId),
          inArray(resignations.userId, userIds),
          inArray(resignations.status, ["APPROVED", "COMPLETED"]),
          isNotNull(resignations.lastWorkingDate),
        ),
      ),
    ]);

  const joiningByUser = new Map(employeeRows.map((r) => [r.id, r.joiningDate ?? null]));
  const exitByUser = new Map<string, string>();
  for (const row of exitRows) {
    const date = row.lastWorkingDate?.slice(0, 10);
    if (!date) continue;
    const existing = exitByUser.get(row.userId);
    if (!existing || date < existing) exitByUser.set(row.userId, date);
  }

  const prevCasualUsed = new Map<string, number>();
  if (casualType) {
    for (const row of prevCasualRows) {
      if (row.leaveTypeId !== casualType.id) continue;
      const clipStart =
        row.startDate.slice(0, 10) > prevBounds.start
          ? row.startDate.slice(0, 10)
          : prevBounds.start;
      const clipEnd =
        row.endDate.slice(0, 10) < prevBounds.end ? row.endDate.slice(0, 10) : prevBounds.end;
      if (clipStart > clipEnd) continue;
      const days = calculateLeaveWorkingDays({
        startDate: clipStart,
        endDate: clipEnd,
        isHalfDay: row.isHalfDay ?? false,
      });
      if (days <= 0) continue;
      prevCasualUsed.set(row.userId, (prevCasualUsed.get(row.userId) ?? 0) + days);
    }
  }

  const holidayDates = new Set(holidayRows.map((h) => h.date));

  const hoursByUser = new Map<string, Map<string, number>>();
  for (const row of attendanceRows) {
    let m = hoursByUser.get(row.userId);
    if (!m) {
      m = new Map();
      hoursByUser.set(row.userId, m);
    }
    const h = parseFloat(String(row.workHours ?? "0")) || 0;
    m.set(row.date, (m.get(row.date) ?? 0) + h);
  }

  const leaveByUser = new Map<string, Map<string, LeaveCoverage>>();
  for (const row of leaveRows) {
    let m = leaveByUser.get(row.userId);
    if (!m) {
      m = new Map();
      leaveByUser.set(row.userId, m);
    }
    const from = row.startDate > start ? row.startDate : start;
    const to = row.endDate < end ? row.endDate : end;
    for (const dateStr of eachDateInclusive(from, to)) {
      const unpaid = row.typeName === LEAVE_POLICY.UNPAID.name || row.typeDaysPerYear === 0;
      const coverage: LeaveCoverage = unpaid ? "UNPAID" : row.isHalfDay ? "HALF" : "FULL";
      const existing = m.get(dateStr);
      // A paid leave beats an unpaid one on the same day; FULL beats HALF.
      if (existing !== "FULL" && !(existing === "HALF" && coverage === "UNPAID")) m.set(dateStr, coverage);
    }
  }

  for (const userId of userIds) {
    const freeLeaveDays = casualMaxUsableInMonth(prevCasualUsed.get(userId) ?? 0);
    // Employment window first: days before joining or after the last working
    // day are not employed days, so they can never become loss of pay (A2).
    const window = employmentWindow({
      month,
      joiningDate: joiningByUser.get(userId) ?? null,
      exitDate: exitByUser.get(userId) ?? null,
      todayIst: today,
    });
    if (window.empty || !window.end) {
      result.set(userId, {
        calDays: calendarDaysInMonth(month),
        workingDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        fullPresentDays: 0,
        paidLeaveDays: 0,
        lopDays: 0,
      });
      continue;
    }
    result.set(
      userId,
      computeStrictAttendance({
        month,
        workHoursByDate: hoursByUser.get(userId) ?? new Map(),
        holidayDates,
        leaveByDate: leaveByUser.get(userId) ?? new Map(),
        freeLeaveDays,
        evaluateThroughDate: through < window.end ? through : window.end,
        employedFromDate: window.start,
      }),
    );
  }

  return result;
}

export async function getStrictPayrollAttendance(
  orgId: string,
  userId: string,
  month: string,
  evaluateThrough?: string,
): Promise<StrictAttendanceResult> {
  const batch = await getStrictPayrollAttendanceBatch(orgId, [userId], month, evaluateThrough);
  return (
    batch.get(userId) ?? {
      calDays: calendarDaysInMonth(month),
      workingDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      fullPresentDays: 0,
      paidLeaveDays: 0,
      lopDays: 0,
    }
  );
}
