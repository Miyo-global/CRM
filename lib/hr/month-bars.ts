const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Twelve Jan-Dec bars from per-month counts. The two leave endpoints key months
 * differently ("2026-03" and "Mar"); the chart sliced "Mar" to "" so every bar
 * lost its label (QA-BUG-02). Months with no rows are 0, so the axis is whole.
 */
export function monthBars(rows: { month: string; count: number }[]): { label: string; value: number }[] {
  const counts = new Array<number>(12).fill(0);
  for (const r of rows) {
    const i = /^\d{4}-\d{2}$/.test(r.month) ? Number(r.month.slice(5)) - 1 : MONTHS.indexOf(r.month);
    if (i >= 0 && i < 12) counts[i] += Number(r.count) || 0;
  }
  return MONTHS.map((label, i) => ({ label, value: counts[i] }));
}
