import "server-only";

import { db } from "@/lib/db";
import { attendance, holidays, leaveRequests } from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, isNotNull, ne } from "drizzle-orm";
import {
  calendarDaysInMonth,
  computeStrictAttendance,
  PAYROLL_EXCLUDED_LEAVE_STATUS,
  type LeaveCoverage,
  type StrictAttendanceResult,
} from "./payroll-calculations";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

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

  const [attendanceRows, holidayRows, leaveRows] = await Promise.all([
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
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.orgId, orgId),
          inArray(leaveRequests.userId, userIds),
          ne(leaveRequests.status, PAYROLL_EXCLUDED_LEAVE_STATUS),
          lte(leaveRequests.startDate, end),
          gte(leaveRequests.endDate, start),
        ),
      ),
  ]);

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
      const coverage: LeaveCoverage = row.isHalfDay ? "HALF" : "FULL";
      const existing = m.get(dateStr);
      if (existing !== "FULL") m.set(dateStr, coverage);
    }
  }

  for (const userId of userIds) {
    result.set(
      userId,
      computeStrictAttendance({
        month,
        workHoursByDate: hoursByUser.get(userId) ?? new Map(),
        holidayDates,
        leaveByDate: leaveByUser.get(userId) ?? new Map(),
        evaluateThroughDate: through,
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
