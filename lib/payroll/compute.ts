import { computeStatutory, type StatutoryParams, type StatutoryComputed } from "@/lib/hr/payroll-calculations";
import {
  earnedSalary,
  employmentWindow,
  perDayRate,
  round2,
  splitEarnings,
  type EmploymentWindow,
} from "./rules";

export interface PayrollComputeInput {
  /** YYYY-MM */
  month: string;
  /** Monthly CTC for the month (already picked from the salary structure). */
  monthlySalary: number;
  joiningDate?: string | null;
  exitDate?: string | null;
  /** Today in IST (YYYY-MM-DD). Caps the evaluated window; see rules.employmentWindow. */
  todayIst?: string | null;
  /** Unpaid absent working days inside the employment window. */
  lopDays: number;
  /** Absent days covered by paid leave (display only). */
  paidLeaveDays?: number;
  overtimeDays?: number;
  overtimeHours?: number;
  overtimeAmount?: number;
  bonus?: number;
  otherDeductions?: number;
  /** Fixed deductions from the salary structure. */
  structureDeductions?: number;
  advanceRecoveryAmount?: number;
  statutory?: StatutoryParams;
  /** The employee's monthly PT from the salary structure; null = not applicable (0). */
  professionalTax?: number | null;
}

export interface PayrollComputeResult {
  month: string;
  calendarDays: number;
  daysEmployed: number;
  employedFrom: string;
  evaluatedThrough: string;
  notEmployed: boolean;
  monthlySalary: number;
  earnedSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  perDay: number;
  lopDays: number;
  paidLeaveDays: number;
  lopDeduction: number;
  professionalTax: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  structureDeductions: number;
  otherDeductions: number;
  advanceRecoveryAmount: number;
  /**
   * True when deductions (before any loan EMI) exceed gross pay. Net is shown
   * as 0, but callers refuse to save such a run rather than hide the shortfall.
   */
  deductionsExceedGross: boolean;
  /** True when a loan EMI was due but net pay could not cover it (MIYO-0125). */
  advanceRecoverySkipped: boolean;
  bonus: number;
  overtimeDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}

const NO_STATUTORY: StatutoryComputed = {
  pfEmployee: 0,
  pfEmployer: 0,
  esiEmployee: 0,
  esiEmployer: 0,
};

/**
 * The one payroll calculation. Pure: the preview, the Generate dialog, the
 * per-employee generate route and the org-wide run all call this with the same
 * inputs, so a previewed breakdown is the breakdown that gets saved (A3).
 */
export function computePayroll(input: PayrollComputeInput): PayrollComputeResult {
  const window: EmploymentWindow = employmentWindow({
    month: input.month,
    joiningDate: input.joiningDate,
    exitDate: input.exitDate,
    todayIst: input.todayIst,
  });

  const monthlySalary = Math.max(0, input.monthlySalary || 0);
  const earned = earnedSalary(monthlySalary, window);
  const earnings = splitEarnings(earned);
  const perDay = perDayRate(monthlySalary);

  const lopDays = window.empty ? 0 : Math.max(0, input.lopDays || 0);
  const bonus = Math.max(0, input.bonus || 0);
  const overtimeAmount = window.empty ? 0 : Math.max(0, input.overtimeAmount || 0);
  const otherDeductions = Math.max(0, input.otherDeductions || 0);
  const structureDeductions = window.empty ? 0 : Math.max(0, input.structureDeductions || 0);

  const lopDeduction = lopDays * perDay;
  const grossSalary = earned + bonus + overtimeAmount;

  const pt = window.empty ? 0 : Math.max(0, input.professionalTax ?? 0);

  const statutory = input.statutory
    ? computeStatutory(
        Math.max(0, earnings.basicSalary - (earnings.basicSalary / Math.max(1, window.calendarDays)) * lopDays),
        Math.max(0, grossSalary - overtimeAmount),
        input.statutory,
        Math.max(0, grossSalary - lopDeduction),
      )
    : NO_STATUTORY;

  const deductionsBeforeRecovery =
    lopDeduction + pt + statutory.pfEmployee + statutory.esiEmployee + structureDeductions + otherDeductions;
  const emi = Math.max(0, input.advanceRecoveryAmount || 0);
  const room = grossSalary - deductionsBeforeRecovery;
  const recoveredLoan = emi > 0 && room >= emi ? emi : 0;
  // MIYO-0125: a skipped EMI used to disappear silently. The run says so, and
  // the caller tells HR.
  const advanceRecoverySkipped = emi > 0 && recoveredLoan === 0;
  const totalDeductions = deductionsBeforeRecovery + recoveredLoan;

  return {
    month: input.month,
    calendarDays: window.calendarDays,
    daysEmployed: window.daysEmployed,
    employedFrom: window.start,
    evaluatedThrough: window.end,
    notEmployed: window.empty,
    monthlySalary,
    earnedSalary: earned,
    basicSalary: earnings.basicSalary,
    hra: earnings.hra,
    specialAllowance: earnings.specialAllowance,
    perDay: round2(perDay),
    lopDays,
    paidLeaveDays: window.empty ? 0 : Math.max(0, input.paidLeaveDays || 0),
    lopDeduction: round2(lopDeduction),
    professionalTax: round2(pt),
    pfEmployee: statutory.pfEmployee,
    pfEmployer: statutory.pfEmployer,
    esiEmployee: statutory.esiEmployee,
    esiEmployer: statutory.esiEmployer,
    structureDeductions: round2(structureDeductions),
    otherDeductions: round2(otherDeductions),
    advanceRecoveryAmount: round2(recoveredLoan),
    deductionsExceedGross: round2(deductionsBeforeRecovery) > round2(grossSalary),
    advanceRecoverySkipped,
    bonus: round2(bonus),
    overtimeDays: window.empty ? 0 : Math.max(0, input.overtimeDays || 0),
    overtimeHours: window.empty ? 0 : Math.max(0, input.overtimeHours || 0),
    overtimeAmount: round2(overtimeAmount),
    grossSalary: round2(grossSalary),
    totalDeductions: round2(totalDeductions),
    netSalary: round2(Math.max(0, grossSalary - totalDeductions)),
  };
}
