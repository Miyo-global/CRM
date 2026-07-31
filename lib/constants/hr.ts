/**
 * HR-domain constants shared across validations, schemas, and business rules.
 */

export const SALARY_MAX_INR = 10_000_000;

export const SALARY_MIN_INR = 0;

export const WORKING_HOURS_PER_DAY = 8;

export const WORKING_DAYS_PER_WEEK = 5;

export const MAX_LEAVE_DAYS_PER_REQUEST = 30;

export const LOAN_MAX_AMOUNT = 1_000_000;

/** Maximum single bonus disbursement (1 lakh INR). */
export const BONUS_MAX_AMOUNT = 100_000;

/** Roles that can view all org bonuses and create or disburse them. */
export const BONUS_MANAGE_ROLES = ["CEO", "HR", "ADMIN", "BRANCH_HR"] as const;
