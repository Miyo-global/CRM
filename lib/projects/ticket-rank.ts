export const RANK_STEP = 1000;
const MIN_GAP = 1e-6;

export type RankResult = { rank: number } | { rebalance: true };

export function computeRank(before: number | null, after: number | null): RankResult {
  if (before === null && after === null) return { rank: RANK_STEP };
  if (before === null) return { rank: (after as number) - RANK_STEP };
  if (after === null) return { rank: before + RANK_STEP };
  if (after - before <= MIN_GAP * 2) return { rebalance: true };
  return { rank: (before + after) / 2 };
}

export function effectiveRank(rank: string | number | null, order: number | null): number {
  if (rank !== null && rank !== "") return Number(rank);
  return (order ?? 0) * RANK_STEP;
}
