/**
 * R3-0200: the headcount chart used to run one count query per month.
 * These helpers let the route run a single grouped query instead: build the
 * 12 month-end dates, then walk the sorted joining dates once.
 */

export type TrendMonth = { label: string; end: string };

/** The last 12 months, oldest first, each with its last calendar day. */
export function trendMonths(now = new Date()): TrendMonth[] {
  const months: TrendMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`,
    });
  }
  return months;
}

/**
 * Running headcount per month. `joins` must be grouped by joining date and
 * sorted ascending; dates are `YYYY-MM-DD`, so string compare is date compare.
 */
export function cumulativeHeadcount(
  months: TrendMonth[],
  joins: { joiningDate: string | null; count: number | string }[],
): { month: string; count: number }[] {
  let cursor = 0;
  let running = 0;
  return months.map(({ label, end }) => {
    while (cursor < joins.length && (joins[cursor].joiningDate ?? "") <= end) {
      running += Number(joins[cursor].count);
      cursor++;
    }
    return { month: label, count: running };
  });
}
