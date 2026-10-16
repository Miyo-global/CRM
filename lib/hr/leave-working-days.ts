/**
 * The one working-day rule for leave.
 *
 * Apply counted Sundays out, the approve deduction counted Saturdays out too,
 * and neither subtracted declared holidays, so the same date range produced
 * three different day counts (QA-0019). Every path — apply, preview, display
 * and deduction — now calls this.
 *
 * Miyo works a six-day week: Sunday is the weekly off, Saturday is a working
 * day (payroll divides by a fixed 31), and declared holidays never count.
 */

/** Sunday and declared holidays are not working days. */
export function countWorkingDays(
  startDate: string,
  endDate: string,
  options: { isHalfDay?: boolean | null; holidays?: Iterable<string> } = {},
): number {
  if (options.isHalfDay) return 0.5;
  return workingDates(startDate, endDate, options.holidays).length;
}

/** The working dates in the range, as YYYY-MM-DD strings. */
export function workingDates(
  startDate: string,
  endDate: string,
  holidays?: Iterable<string>,
): string[] {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (!start || !end || end < start) return [];

  const holidaySet = new Set(holidays ?? []);
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const ymd = cursor.toISOString().slice(0, 10);
    if (cursor.getUTCDay() === 0) continue;
    if (holidaySet.has(ymd)) continue;
    dates.push(ymd);
  }
  return dates;
}

/** Whether the whole range is weekend and/or declared holidays. */
export function isNonWorkingRange(
  startDate: string,
  endDate: string,
  holidays?: Iterable<string>,
): boolean {
  return workingDates(startDate, endDate, holidays).length === 0;
}

function parseYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? "");
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
