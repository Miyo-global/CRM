import type { PayrollComputeResult } from "./compute";
import { getTodayString } from "@/lib/date-utils";

/**
 * Last day counted for a run: the month end, or today (IST) for a month that
 * has not ended yet, or an earlier custom period end (MIYO-0074).
 */
export function generatedThroughFor(month: string, periodEnd?: string, today = getTodayString()): string {
  const [y, m] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  return [monthEnd, today, periodEnd].filter((d): d is string => !!d).sort()[0];
}

/**
 * Map a computed run onto payroll table columns. Shared by the per-employee
 * generate route and the org-wide run, so a saved record is always exactly the
 * previewed breakdown (A3).
 */
export function payrollRowValues(
  run: PayrollComputeResult,
  meta: { orgId: string; userId: string; generatedBy: string; periodEnd?: string },
) {
  return {
    orgId: meta.orgId,
    userId: meta.userId,
    month: run.month,
    basicSalary: run.basicSalary.toString(),
    hra: run.hra.toString(),
    specialAllowance: run.specialAllowance.toString(),
    allowances: run.bonus.toString(),
    lopDays: run.lopDays.toString(),
    lopAmount: run.lopDeduction.toString(),
    halfDays: "0",
    halfDayAmount: "0",
    ptAmount: run.professionalTax.toString(),
    pfEmployee: run.pfEmployee.toString(),
    pfEmployer: run.pfEmployer.toString(),
    esiEmployee: run.esiEmployee.toString(),
    esiEmployer: run.esiEmployer.toString(),
    advanceRecoveryAmount: run.advanceRecoveryAmount.toString(),
    otherDeductions: run.otherDeductions.toString(),
    structureDeductions: run.structureDeductions.toString(),
    deductions: run.totalDeductions.toString(),
    grossSalary: run.grossSalary.toString(),
    netSalary: run.netSalary.toString(),
    status: "DRAFT" as const,
    generatedBy: meta.generatedBy,
    overtimeType: run.overtimeDays > 0 ? "days" : null,
    overtimeDays: run.overtimeDays.toString(),
    overtimeAmount: run.overtimeAmount.toString(),
    leaveDaysDisplay: run.paidLeaveDays.toString(),
    generatedThrough: generatedThroughFor(run.month, meta.periodEnd),
  };
}
