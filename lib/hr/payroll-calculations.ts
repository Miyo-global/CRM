
export const PROFESSIONAL_TAX_INR = 200;

export const HOLIDAY_WORK_FULL_DAY_HOURS = 9;

export interface ProrationSegment {
  basicSalary: number;
  hraPercentage: number;
  specialAllowance: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ProratedComponents {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  ctcMonthly: number;
  segmentDays: { from: string; to: string; days: number; ctc: number }[];
}

export function computeProratedSalary(
  monthYyyyMm: string,
  structures: ProrationSegment[]
): ProratedComponents {
  const calDays = calendarDaysInMonth(monthYyyyMm);
  const [yr, mo] = monthYyyyMm.split("-").map(Number);
  const monthStartDay = 1;
  const monthEndDay = calDays;

  const dayOfMonth = (s: string): number => {
    const parts = s.slice(0, 10).split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return monthStartDay;
    const [py, pm, pd] = parts;
    if (py < yr || (py === yr && pm < mo)) return monthStartDay;
    if (py > yr || (py === yr && pm > mo)) return monthEndDay + 1;
    return pd;
  };

  const breakdown: { from: string; to: string; days: number; ctc: number }[] = [];
  let basicSum = 0;
  let hraSum = 0;
  let specialSum = 0;

  for (const s of structures) {
    const fromDay = Math.max(monthStartDay, dayOfMonth(s.effectiveFrom));
    const toDay = Math.min(monthEndDay, s.effectiveTo ? dayOfMonth(s.effectiveTo) : monthEndDay);
    if (fromDay > toDay) continue;

    const days = toDay - fromDay + 1;
    const fraction = days / calDays;
    const hra = (s.basicSalary * s.hraPercentage) / 100;
    const segCtc = s.basicSalary + hra + s.specialAllowance;

    basicSum += s.basicSalary * fraction;
    hraSum += hra * fraction;
    specialSum += s.specialAllowance * fraction;
    breakdown.push({
      from: `${monthYyyyMm}-${String(fromDay).padStart(2, "0")}`,
      to: `${monthYyyyMm}-${String(toDay).padStart(2, "0")}`,
      days,
      ctc: segCtc * fraction,
    });
  }

  return {
    basicSalary: roundInr(basicSum),
    hra: roundInr(hraSum),
    specialAllowance: roundInr(specialSum),
    ctcMonthly: roundInr(basicSum + hraSum + specialSum),
    segmentDays: breakdown,
  };
}

export interface StatutoryParams {
  pfApplicable: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfWageCeiling: number;
  esiApplicable: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiWageCeiling: number;
}

export interface StatutoryComputed {
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
}

export function computeStatutory(
  pfWage: number,
  esiEligibilityWage: number,
  params: StatutoryParams,
  esiContributionWage: number = esiEligibilityWage
): StatutoryComputed {
  let pfEmployee = 0;
  let pfEmployer = 0;
  if (params.pfApplicable) {
    const pfBase = Math.min(Math.max(0, pfWage), params.pfWageCeiling);
    pfEmployee = roundInr((pfBase * params.pfEmployeeRate) / 100);
    pfEmployer = roundInr((pfBase * params.pfEmployerRate) / 100);
  }

  let esiEmployee = 0;
  let esiEmployer = 0;
  if (params.esiApplicable && esiEligibilityWage <= params.esiWageCeiling) {
    const esiBase = Math.max(0, esiContributionWage);
    esiEmployee = roundInr((esiBase * params.esiEmployeeRate) / 100);
    esiEmployer = roundInr((esiBase * params.esiEmployerRate) / 100);
  }

  return { pfEmployee, pfEmployer, esiEmployee, esiEmployer };
}

export function computePayrollStatutory(opts: {
  basicSalary: number;
  ctcMonthly: number;
  grossSalary: number;
  overtimeAmount: number;
  month: string;
  lopDays: number;
  params: StatutoryParams;
}): StatutoryComputed {
  const calDays = calendarDaysInMonth(opts.month);
  const lopUnits = opts.lopDays || 0;
  const perDayBasic = calDays > 0 ? opts.basicSalary / calDays : 0;
  const pfWage = Math.max(0, opts.basicSalary - perDayBasic * lopUnits);
  const lopDed = roundInr(rawLopDeduction(opts.month, opts.ctcMonthly, opts.ctcMonthly, opts.lopDays));
  const esiEligibilityWage = Math.max(0, opts.grossSalary - (opts.overtimeAmount || 0));
  const esiContributionWage = Math.max(0, opts.grossSalary - lopDed);
  return computeStatutory(pfWage, esiEligibilityWage, opts.params, esiContributionWage);
}

export function calendarDaysInMonth(monthYyyyMm: string): number {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export function perDaySalaryForLop(monthYyyyMm: string, monthlySalary: number, grossSalary: number): number {
  const days = calendarDaysInMonth(monthYyyyMm);
  if (days <= 0) return 0;
  const base = monthlySalary > 0 ? monthlySalary : grossSalary;
  return base / days;
}

export function rawLopDeduction(monthYyyyMm: string, monthlySalary: number, grossSalary: number, lopDays: number): number {
  const perDay = perDaySalaryForLop(monthYyyyMm, monthlySalary, grossSalary);
  return (lopDays || 0) * perDay;
}

export function roundInr(value: number): number {
  return Math.round(value);
}

export function splitMonthlyCtc505025(ctcMonthly: number): {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
} {
  const ctc = roundInr(ctcMonthly);
  const basicSalary = roundInr(ctc * 0.5);
  const hra = roundInr(ctc * 0.25);
  const specialAllowance = roundInr(ctc - basicSalary - hra);
  return { basicSalary, hra, specialAllowance };
}

export function computeTotalDeductionsAndNet(params: {
  month: string;
  monthlySalary: number;
  grossSalary: number;
  salaryStructureDeductions: number;
  lopDays: number;
  otherDeductions: number;
  professionalTax?: number;
  pfEmployee?: number;
  esiEmployee?: number;
  advanceRecoveryAmount?: number;
}): {
  lopDeduction: number;
  recoveredLoan: number;
  totalDeductions: number;
  netSalary: number;
} {
  const pt = roundInr(params.professionalTax ?? PROFESSIONAL_TAX_INR);
  const lopDeduction = roundInr(
    rawLopDeduction(params.month, params.monthlySalary, params.grossSalary, params.lopDays)
  );
  const pfEmployee = params.pfEmployee || 0;
  const esiEmployee = params.esiEmployee || 0;
  const deductionsBeforeRecovery =
    roundInr(params.salaryStructureDeductions || 0) +
    lopDeduction +
    pt +
    pfEmployee +
    esiEmployee +
    roundInr(params.otherDeductions || 0);
  const emi = params.advanceRecoveryAmount || 0;
  const room = params.grossSalary - deductionsBeforeRecovery;
  const recoveredLoan = emi > 0 && room >= emi ? roundInr(emi) : 0;
  const totalDeductions = deductionsBeforeRecovery + recoveredLoan;
  const netSalary = Math.max(0, roundInr(params.grossSalary - totalDeductions));
  return {
    lopDeduction,
    recoveredLoan,
    totalDeductions,
    netSalary,
  };
}

export interface PayslipPreviewInput {
  monthlySalary: number;
  month: string;
  lopDays: number;
  otherDeductions: number;
  bonus: number;
  overtimeAmount: number;
  overtimeType: string;
  overtimeDays: number;
  overtimeHours: number;
  basicSalary?: number;
  hraPercentage?: number;
  allowances?: number;
  salaryStructureDeductions?: number;
  professionalTax?: number;
  statutory?: StatutoryParams;
  advanceRecoveryAmount?: number;
}

export function buildPayslipPreviewFromEmployee(input: PayslipPreviewInput) {
  const monthlySalary = input.monthlySalary;
  const calendarDays = calendarDaysInMonth(input.month);
  const otAmt = input.overtimeAmount || 0;
  const bonusAmt = input.bonus || 0;
  const structDed = input.salaryStructureDeductions ?? 0;
  const pt = input.professionalTax ?? PROFESSIONAL_TAX_INR;

  let basicPay: number;
  let hra: number;
  let allowances: number;
  let grossSalary: number;

  if (input.basicSalary !== undefined) {
    basicPay = input.basicSalary;
    const hraPercentage = input.hraPercentage ?? 50;
    hra = roundInr((basicPay * hraPercentage) / 100);
    allowances = roundInr(input.allowances ?? 0);
    grossSalary = roundInr(basicPay + hra + allowances + bonusAmt + otAmt);
  } else {
    const split = splitMonthlyCtc505025(monthlySalary);
    basicPay = split.basicSalary;
    hra = split.hra;
    allowances = split.specialAllowance;
    grossSalary = roundInr(monthlySalary + bonusAmt + otAmt);
  }

  const ctcForStatutory =
    input.basicSalary !== undefined ? roundInr(basicPay + hra + allowances) : roundInr(monthlySalary);
  const statutory = input.statutory
    ? computePayrollStatutory({
        basicSalary: basicPay,
        ctcMonthly: ctcForStatutory,
        grossSalary,
        overtimeAmount: otAmt,
        month: input.month,
        lopDays: input.lopDays,
        params: input.statutory,
      })
    : { pfEmployee: 0, pfEmployer: 0, esiEmployee: 0, esiEmployer: 0 };
  const advanceRecoveryAmount = input.advanceRecoveryAmount || 0;

  const { lopDeduction, recoveredLoan, totalDeductions, netSalary } = computeTotalDeductionsAndNet({
    month: input.month,
    monthlySalary,
    grossSalary,
    salaryStructureDeductions: structDed,
    lopDays: input.lopDays,
    otherDeductions: input.otherDeductions,
    professionalTax: pt,
    pfEmployee: statutory.pfEmployee,
    esiEmployee: statutory.esiEmployee,
    advanceRecoveryAmount,
  });

  return {
    basicPay,
    hra,
    allowances,
    grossSalary,
    lopDeduction,
    professionalTax: pt,
    pfEmployee: statutory.pfEmployee,
    esiEmployee: statutory.esiEmployee,
    advanceRecoveryAmount: recoveredLoan,
    otherDeductions: input.otherDeductions || 0,
    bonus: bonusAmt,
    overtimeAmount: otAmt,
    overtimeType: input.overtimeType,
    overtimeDays: input.overtimeDays,
    overtimeHours: input.overtimeHours,
    totalDeductions,
    netSalary,
    lopDays: input.lopDays,
    calendarDays,
    workingDays: calendarDays,
    effectiveDays: Math.max(0, calendarDays - input.lopDays),
    salaryStructureDeductions: structDed,
  };
}

export const MONTHLY_FREE_LEAVE_DAYS = 1;
/** Daily hours above which check-out asks the employee for an overtime worklog. */
export const OVERTIME_PROMPT_MIN_HOURS = 9;

export type LeaveCoverage = "FULL" | "HALF";

export interface StrictAttendanceInput {
  month: string;
  /** Date -> total logged work hours (only dates with a check-in are included). */
  workHoursByDate: ReadonlyMap<string, number>;
  holidayDates: ReadonlySet<string>;
  leaveByDate: ReadonlyMap<string, LeaveCoverage>;
  freeLeaveDays?: number;
  evaluateThroughDate?: string;
}

export interface StrictAttendanceResult {
  calDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  fullPresentDays: number;
  paidLeaveDays: number;
  lopDays: number;
}

/** Leave requests with these statuses are ignored for payroll (cancelled only). */
export const PAYROLL_EXCLUDED_LEAVE_STATUS = "CANCELLED" as const;

export function computeStrictAttendance(input: StrictAttendanceInput): StrictAttendanceResult {
  const { workHoursByDate, holidayDates } = input;
  const [yStr, mStr] = input.month.split("-");
  const year = Number(yStr);
  const month1 = Number(mStr);
  const calDays = calendarDaysInMonth(input.month);
  const through =
    input.evaluateThroughDate && input.evaluateThroughDate >= `${input.month}-01`
      ? input.evaluateThroughDate.slice(0, 10)
      : `${input.month}-${String(calDays).padStart(2, "0")}`;

  let weekendDays = 0;
  let holidayDays = 0;
  let fullPresentDays = 0;
  let paidLeaveDays = 0;
  let lopDays = 0;
  let workingDays = 0;
  let leaveBudget = input.freeLeaveDays ?? MONTHLY_FREE_LEAVE_DAYS;

  for (let day = 1; day <= calDays; day++) {
    const dateStr = `${input.month}-${String(day).padStart(2, "0")}`;
    if (dateStr > through) break;

    const dow = new Date(year, month1 - 1, day).getDay();
    if (dow === 0) {
      weekendDays++;
      continue;
    }
    if (holidayDates.has(dateStr)) {
      holidayDays++;
      continue;
    }

    workingDays++;
    const loggedIn = workHoursByDate.has(dateStr);

    if (loggedIn) {
      fullPresentDays++;
      continue;
    }

    // First absent day(s) each month auto-count as paid casual leave (approval not required).
    if (leaveBudget >= 1) {
      paidLeaveDays += 1;
      leaveBudget -= 1;
    } else {
      lopDays += 1;
    }
  }

  return {
    calDays,
    workingDays,
    weekendDays,
    holidayDays,
    fullPresentDays,
    paidLeaveDays,
    lopDays,
  };
}
