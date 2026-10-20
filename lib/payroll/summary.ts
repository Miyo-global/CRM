import { payrollStatusEnum } from "@/lib/db/schema/enums";

type PayrollStatus = (typeof payrollStatusEnum.enumValues)[number];

/**
 * Payroll the summary counts: submitted (pending approval), approved and paid.
 * Typed against the enum so a value that does not exist, like the old
 * 'SUBMITTED', fails the build instead of every query (QA-BUG-01).
 */
export const PAYROLL_SUMMARY_STATUSES: PayrollStatus[] = ["PENDING_APPROVAL", "APPROVED", "PAID"];

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** "YYYY-MM" for the month of `now` and the one before it. */
export function payrollSummaryMonths(now: Date): { current: string; previous: string } {
  return { current: ym(now), previous: ym(new Date(now.getFullYear(), now.getMonth() - 1, 1)) };
}
