import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";

function utcDateOnly(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

export function leaveDaysOverlappingMonth(
  startDate: string,
  endDate: string,
  monthYyyyMm: string,
  isHalfDay: boolean
): number {
  const last = calendarDaysInMonth(monthYyyyMm);
  const monthStartStr = `${monthYyyyMm}-01`;
  const monthEndStr = `${monthYyyyMm}-${String(last).padStart(2, "0")}`;
  const s = startDate.slice(0, 10);
  const e = endDate.slice(0, 10);
  const lo = s > monthStartStr ? s : monthStartStr;
  const hi = e < monthEndStr ? e : monthEndStr;
  if (lo > hi) return 0;
  if (isHalfDay && lo === hi) return 0.5;
  return (utcDateOnly(hi) - utcDateOnly(lo)) / 86_400_000 + 1;
}
