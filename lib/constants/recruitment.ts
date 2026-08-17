/**
 * How long a rejected candidate is blocked from reapplying. Recruitment
 * policy, so configurable per deployment.
 */
export const REJECTION_COOLDOWN_DAYS = (() => {
  const raw = process.env.NEXT_PUBLIC_REJECTION_COOLDOWN_DAYS?.trim();
  if (!raw) return 30;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 30;
})();

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
