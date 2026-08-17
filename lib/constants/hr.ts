/**
 * HR-domain constants shared across validations, schemas, and business rules.
 *
 * These are company policy, not universal truths — the defaults are what the
 * app shipped with. Override them per deployment with the env vars below;
 * amounts are in the currency configured by NEXT_PUBLIC_DEFAULT_CURRENCY.
 */

/** Read a positive number from the environment, ignoring blank/invalid values. */
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const SALARY_MAX_INR = envNumber("NEXT_PUBLIC_SALARY_MAX", 10_000_000);

export const SALARY_MIN_INR = envNumber("NEXT_PUBLIC_SALARY_MIN", 0);

export const WORKING_HOURS_PER_DAY = envNumber("NEXT_PUBLIC_WORKING_HOURS_PER_DAY", 8);

export const WORKING_DAYS_PER_WEEK = envNumber("NEXT_PUBLIC_WORKING_DAYS_PER_WEEK", 5);

export const MAX_LEAVE_DAYS_PER_REQUEST = envNumber(
  "NEXT_PUBLIC_MAX_LEAVE_DAYS_PER_REQUEST",
  30,
);

export const LOAN_MAX_AMOUNT = envNumber("NEXT_PUBLIC_LOAN_MAX_AMOUNT", 1_000_000);

/** Maximum single bonus disbursement. */
export const BONUS_MAX_AMOUNT = envNumber("NEXT_PUBLIC_BONUS_MAX_AMOUNT", 100_000);

/** Roles that can view all org bonuses and create or disburse them. */
export const BONUS_MANAGE_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR"] as const;
