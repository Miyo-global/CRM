import { addDaysToDateString, getTodayString, zonedDayStartUtc } from "@/lib/date-utils";

/**
 * Bounds for the Expenses KPI tiles, in the org timezone (IST): "today" for
 * Approved/Rejected Today and the calendar month for Total Claimed. Instants
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
  };
}
