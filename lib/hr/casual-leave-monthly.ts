import { LEAVE_POLICY } from "@/lib/leave-policy";

const PER_MONTH = LEAVE_POLICY.CASUAL.perMonth;

/** Unused accrual from the previous month that carries into the current month (0..perMonth). */
export function casualCarryFromPreviousMonth(usedInPrevMonth: number): number {
  const used = Math.max(0, usedInPrevMonth);
  return Math.min(PER_MONTH, Math.max(0, PER_MONTH - used));
}

/**
 * Max casual days usable in the current month:
 * this month's accrual + at most one prior month of unused accrual.
 */
export function casualMaxUsableInMonth(usedInPrevMonth: number): number {
  return PER_MONTH + casualCarryFromPreviousMonth(usedInPrevMonth);
}

/**
 * Days from the earn-month accrual that expire after the one-month carry window.
 * FIFO: usage in the earn month, then usage in the carry month, consume the earn bucket.
 */
export function casualDaysExpiringFromEarnMonth(
  usedInEarnMonth: number,
  usedInCarryMonth: number,
): number {
  const earnUsed = Math.max(0, usedInEarnMonth);
  const carryUsed = Math.max(0, usedInCarryMonth);
  return Math.max(0, PER_MONTH - earnUsed - carryUsed);
}

export function previousCalendarMonth(year: number, monthIndex0: number): {
  year: number;
  monthIndex0: number;
  yyyyMm: string;
} {
  const monthIndex0Prev = monthIndex0 === 0 ? 11 : monthIndex0 - 1;
  const yearPrev = monthIndex0 === 0 ? year - 1 : year;
  return {
    year: yearPrev,
    monthIndex0: monthIndex0Prev,
    yyyyMm: `${yearPrev}-${String(monthIndex0Prev + 1).padStart(2, "0")}`,
  };
}

export function monthBoundsYyyyMm(yyyyMm: string): { start: string; end: string } {
  const [yStr, mStr] = yyyyMm.split("-");
  const year = Number(yStr);
  const month1 = Number(mStr);
  const last = new Date(year, month1, 0).getDate();
  return {
    start: `${yyyyMm}-01`,
    end: `${yyyyMm}-${String(last).padStart(2, "0")}`,
  };
}

/** List YYYY-MM values spanned by an inclusive date range. */
export function monthsSpannedByDateRange(startYmd: string, endYmd: string): string[] {
  const start = startYmd.slice(0, 10);
  const end = endYmd.slice(0, 10);
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [endY, endM] = end.split("-").map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
