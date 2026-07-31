/**
 * Centralised status constants.
 * Eliminates scattered status strings across Zod enums, SQL comparisons, and type unions.
 */

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const COMMISSION_STATUSES = ["pending", "approved", "paid", "rejected"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const DEAL_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type DealApprovalStatus = (typeof DEAL_APPROVAL_STATUSES)[number];

export const CYCLE_STATUSES = ["draft", "active", "completed", "archived"] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const INTAKE_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

export const CALIBRATION_STATUSES = ["pending", "approved", "rejected", "duplicate"] as const;
export type CalibrationStatus = (typeof CALIBRATION_STATUSES)[number];

export const SEPARATION_STATUSES = ["pending_ceo", "approved", "rejected", "sent"] as const;
export type SeparationStatus = (typeof SEPARATION_STATUSES)[number];

export const JOB_POSTING_STATUSES = ["draft", "active", "closed", "on_hold"] as const;
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatusConst = (typeof LEAVE_STATUSES)[number];

export const EXPENSE_STATUSES = ["pending", "approved", "rejected", "paid"] as const;
export type ExpenseStatusConst = (typeof EXPENSE_STATUSES)[number];
