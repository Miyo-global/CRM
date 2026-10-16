/**
 * Percentages that add up to 100.
 *
 * Rounding each share on its own left the analytics splits summing to 99 or
 * 101 (QA-0015). Largest-remainder apportionment gives whole percentages whose
 * total is exactly 100 whenever the counts are.
 */
export function percentageSplit<T extends { count: number }>(
  items: T[],
): (T & { pct: number })[] {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  if (total <= 0) return items.map((i) => ({ ...i, pct: 0 }));

  const exact = items.map((item) => {
    const share = (item.count / total) * 100;
    const floor = Math.floor(share);
    return { item, floor, remainder: share - floor };
  });

  let left = 100 - exact.reduce((sum, e) => sum + e.floor, 0);
  const byRemainder = [...exact].sort((a, b) => b.remainder - a.remainder);
  for (const entry of byRemainder) {
    if (left <= 0) break;
    entry.floor += 1;
    left -= 1;
  }

  return exact.map((e) => ({ ...e.item, pct: e.floor }));
}
