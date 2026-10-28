import { addDaysToDateString, getTodayString, zonedDayStartUtc } from "@/lib/date-utils";

/**
 * Bounds for the Expenses KPI tiles, in the org timezone (IST): "today" for
 * Approved/Rejected Today, the calendar month for Total Claimed, and for the
 * employee tiles the calendar year (Reimbursed YTD) and the last 30 days
 * including today (Rejected 30d). Instants
 * are ISO strings, which compare correctly against the UTC
 * `timestamp without time zone` columns; month bounds are dates.
 */
export function expenseKpiWindows(today: string = getTodayString()) {
  const [y, m] = today.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1));
  return {
    dayStart: zonedDayStartUtc(today).toISOString(),
    dayEnd: zonedDayStartUtc(addDaysToDateString(today, 1)).toISOString(),
    monthStart: `${today.slice(0, 7)}-01`,
    nextMonthStart: next.toISOString().slice(0, 10),
    yearStart: zonedDayStartUtc(`${today.slice(0, 4)}-01-01`).toISOString(),
    last30Start: zonedDayStartUtc(addDaysToDateString(today, -29)).toISOString(),
  };
}
