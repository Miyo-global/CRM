/**
 * Executive KPI math for /hr/analytics (R2-HR-02).
 *
 * Every count here is over active members, the same people /hr lists, so a
 * rate can never exceed 100%: counting hires among every member, terminated
 * ones included, against an active-only headcount read 390%.
 */

const pct = (part: number, whole: number) => (whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0);

/** Exits in the period over the people employed in it (still active + left). */
export function attritionRate(activeHeadcount: number, exits: number): number {
  return pct(exits, activeHeadcount + exits);
}

/** Active employees who joined in the period, over active headcount. */
export function hiringRate(headcount: number, activeHires: number): number {
  return pct(activeHires, headcount);
}

/**
 * Share of women among employees whose gender is recorded. A blank gender is
 * not a man: counting blanks in the denominator read 0% for an org with no
 * genders filled in. Null when nobody has one.
 */
export function diversityRatio(genderCounts: { gender: string | null; count: number }[]): number | null {
  const recorded = genderCounts.filter((g) => g.gender != null);
  const total = recorded.reduce((s, g) => s + g.count, 0);
  if (total === 0) return null;
  const female = recorded.find((g) => g.gender === "FEMALE")?.count ?? 0;
  return pct(female, total);
}

/** 0–100; a missing input scores a neutral 50 rather than dragging it to 0. */
export function orgHealthScore(attrition: number, diversity: number | null, avgTenureMonths: number | null): number {
  const attritionScore = Math.max(0, 100 - attrition * 2);
  const diversityScore = diversity != null ? Math.min(100, diversity * 2) : 50;
  const tenureScore = avgTenureMonths != null ? Math.min(100, (avgTenureMonths / 36) * 100) : 50;
  return Math.round(attritionScore * 0.4 + diversityScore * 0.3 + tenureScore * 0.3);
}
