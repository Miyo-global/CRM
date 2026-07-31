import { eachDayOfInterval, isWeekend, min, startOfDay, format } from "date-fns";
import { fromISODateString, formatDateOnly } from "@/lib/date-utils";
import type { AttendancePeriodSummary, AttendanceSummaryPeriod } from "@/types/hr";

export function isPresentAttendanceStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toUpperCase();
  return (
    s === "PRESENT" ||
    s === "CHECKED_OUT" ||
    s === "WORK_FROM_HOME" ||
    s === "LATE" ||
    s === "ON_BREAK"
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthRangeYmd(year: number, month0: number): { start: string; end: string; label: string } {
  const mm = pad2(month0 + 1);
  const start = `${year}-${mm}-01`;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const end = `${year}-${mm}-${pad2(lastDay)}`;
  const label = format(new Date(year, month0, 1), "MMMM yyyy");
  return { start, end, label };
}

export function quarterRangeYmd(
  year: number,
  quarter1: number,
): { start: string; end: string; label: string } {
  const q = Math.min(4, Math.max(1, quarter1));
  const startMonth0 = (q - 1) * 3;
  const endMonth0 = startMonth0 + 2;
  const start = `${year}-${pad2(startMonth0 + 1)}-01`;
  const lastDay = new Date(year, endMonth0 + 1, 0).getDate();
  const end = `${year}-${pad2(endMonth0 + 1)}-${pad2(lastDay)}`;
  const label = `Q${q} ${year}`;
  return { start, end, label };
}

export function yearRangeYmd(year: number): { start: string; end: string; label: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: String(year),
  };
}

export function resolveAttendancePeriod(
  period: AttendanceSummaryPeriod,
  year: number,
  month0?: number,
  quarter1?: number,
): { start: string; end: string; label: string } {
  if (period === "month") {
    const m = month0 ?? 0;
    return monthRangeYmd(year, m);
  }
  if (period === "quarter") {
    return quarterRangeYmd(year, quarter1 ?? 1);
  }
  return yearRangeYmd(year);
}

export function summarizeAttendanceLogs(
  logs: { date: string; status: string | null; workHours: string | null }[],
  rangeStart: string,
  rangeEnd: string,
  today: Date = new Date(),
  period: AttendanceSummaryPeriod,
  label: string,
  holidayDates: ReadonlySet<string> = new Set(),
): AttendancePeriodSummary {
  const start = fromISODateString(rangeStart);
  const end = fromISODateString(rangeEnd);
  const todayStart = startOfDay(today);
  const effectiveEnd = min([end, todayStart]);

  let weekdaysInPeriod = 0;
  for (const d of eachDayOfInterval({ start, end })) {
    if (isWeekend(d)) continue;
    if (holidayDates.has(formatDateOnly(d))) continue;
    weekdaysInPeriod++;
  }

  const hoursByDate = new Map<string, number>();
  const presentDates = new Set<string>();

  for (const log of logs) {
    const h = parseFloat(String(log.workHours ?? "0")) || 0;
    hoursByDate.set(log.date, (hoursByDate.get(log.date) ?? 0) + h);
    if (isPresentAttendanceStatus(log.status)) {
      presentDates.add(log.date);
    }
  }

  let weekdaysElapsed = 0;
  let presentWeekdays = 0;
  if (effectiveEnd >= start) {
    for (const d of eachDayOfInterval({ start, end: effectiveEnd })) {
      if (isWeekend(d)) continue;
      const ds = formatDateOnly(d);
      if (holidayDates.has(ds)) continue;
      weekdaysElapsed++;
      if (presentDates.has(ds)) presentWeekdays++;
    }
  }

  const absentWeekdays = Math.max(0, weekdaysElapsed - presentWeekdays);
  const totalWorkHours = [...hoursByDate.values()].reduce((a, b) => a + b, 0);
  const loggedDays = hoursByDate.size;

  const attendanceRatePct =
    weekdaysElapsed > 0 ? Math.round((presentWeekdays / weekdaysElapsed) * 1000) / 10 : 0;

  const avgHoursPerWeekdayElapsed =
    weekdaysElapsed > 0 ? Math.round((totalWorkHours / weekdaysElapsed) * 100) / 100 : 0;

  const avgHoursPerPresentDay =
    presentWeekdays > 0 ? Math.round((totalWorkHours / presentWeekdays) * 100) / 100 : 0;

  return {
    period,
    label,
    rangeStart,
    rangeEnd,
    weekdaysInPeriod,
    weekdaysElapsed,
    presentWeekdays,
    absentWeekdays,
    attendanceRatePct,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    avgHoursPerWeekdayElapsed,
    avgHoursPerPresentDay,
    loggedDays,
  };
}
