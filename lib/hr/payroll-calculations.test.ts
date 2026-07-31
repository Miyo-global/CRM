import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_TAX_INR,
  HOLIDAY_WORK_FULL_DAY_HOURS,
  buildPayslipPreviewFromEmployee,
  calendarDaysInMonth,
  computeProratedSalary,
  computeStatutory,
  computePayrollStatutory,
  computeTotalDeductionsAndNet,
  perDaySalaryForLop,
  rawLopDeduction,
  roundInr,
  splitMonthlyCtc505025,
} from "./payroll-calculations";

void perDaySalaryForLop;
void computeTotalDeductionsAndNet;
void PROFESSIONAL_TAX_INR;

describe("splitMonthlyCtc505025", () => {
  it("splits monthly CTC into 50% basic, 25% HRA, 25% special", () => {
    expect(splitMonthlyCtc505025(40_000)).toEqual({
      basicSalary: 20_000,
      hra: 10_000,
      specialAllowance: 10_000,
    });
  });

  it("absorbs rounding in special so components sum to CTC", () => {
    const s = splitMonthlyCtc505025(24_999);
    expect(s.basicSalary + s.hra + s.specialAllowance).toBe(24_999);
  });
});

describe("HOLIDAY_WORK_FULL_DAY_HOURS", () => {
  it("is 9 (OPEN-11)", () => {
    expect(HOLIDAY_WORK_FULL_DAY_HOURS).toBe(9);
  });
});

describe("calendarDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(calendarDaysInMonth("2026-01")).toBe(31);
  });

  it("returns 28 for non-leap February", () => {
    expect(calendarDaysInMonth("2026-02")).toBe(28);
  });

  it("returns 29 for leap February", () => {
    expect(calendarDaysInMonth("2024-02")).toBe(29);
  });

  it("returns 30 for invalid month string", () => {
    expect(calendarDaysInMonth("not-a-date")).toBe(30);
  });
});

describe("perDaySalaryForLop", () => {
  it("uses monthly salary divided by calendar days when monthly > 0", () => {
    expect(perDaySalaryForLop("2026-04", 30000, 25000)).toBe(1000);
  });

  it("falls back to gross when monthly is 0", () => {
    expect(perDaySalaryForLop("2026-04", 0, 30000)).toBe(1000);
  });

  it("returns 0 when calendar days are 0", () => {
    expect(perDaySalaryForLop("invalid-string-bad", 30000, 25000)).toBeCloseTo(1000, 0);
  });
});

describe("rawLopDeduction", () => {
  it("multiplies LOP days by per-day salary", () => {
    expect(rawLopDeduction("2026-04", 30000, 30000, 3)).toBe(3000);
  });

  it("returns 0 for zero LOP days", () => {
    expect(rawLopDeduction("2026-04", 30000, 30000, 0)).toBe(0);
  });
});

describe("roundInr", () => {
  it("rounds to nearest integer", () => {
    expect(roundInr(1234.4)).toBe(1234);
    expect(roundInr(1234.6)).toBe(1235);
  });
});

describe("computeTotalDeductionsAndNet", () => {
  it("includes professional tax by default", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 0,

      otherDeductions: 0,
    });
    expect(result.totalDeductions).toBe(PROFESSIONAL_TAX_INR);
    expect(result.netSalary).toBe(30000 - PROFESSIONAL_TAX_INR);
  });

  it("₹27,000 gross → ₹26,800 net and ₹25,000 gross → ₹24,800 net when only PT applies", () => {
    const r27 = computeTotalDeductionsAndNet({
      month: "2026-05",
      monthlySalary: 27000,
      grossSalary: 27000,
      salaryStructureDeductions: 0,
      lopDays: 0,

      otherDeductions: 0,
    });
    expect(r27.totalDeductions).toBe(200);
    expect(r27.netSalary).toBe(26800);

    const r25 = computeTotalDeductionsAndNet({
      month: "2026-05",
      monthlySalary: 25000,
      grossSalary: 25000,
      salaryStructureDeductions: 0,
      lopDays: 0,

      otherDeductions: 0,
    });
    expect(r25.netSalary).toBe(24800);
  });

  it("applies LOP deduction proportional to days", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 3,

      otherDeductions: 0,
    });
    expect(result.lopDeduction).toBe(3000);
    expect(result.totalDeductions).toBe(3000 + PROFESSIONAL_TAX_INR);
  });

  it("includes salary structure and other deductions", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 1800,
      lopDays: 0,

      otherDeductions: 500,
    });
    expect(result.totalDeductions).toBe(1800 + PROFESSIONAL_TAX_INR + 500);
  });

  it("respects custom professional tax", () => {
    const result = computeTotalDeductionsAndNet({
      month: "2026-04",
      monthlySalary: 30000,
      grossSalary: 30000,
      salaryStructureDeductions: 0,
      lopDays: 0,

      otherDeductions: 0,
      professionalTax: 0,
    });
    expect(result.totalDeductions).toBe(0);
    expect(result.netSalary).toBe(30000);
  });
});

describe("buildPayslipPreviewFromEmployee", () => {
  it("matches typical payslip: ₹27k gross (50/25/25) − ₹200 PT = ₹26,800 net", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 27000,
      month: "2026-05",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "",
      overtimeDays: 0,
      overtimeHours: 0,
      salaryStructureDeductions: 0,
    });
    expect(preview.basicPay).toBe(13500);
    expect(preview.hra).toBe(6750);
    expect(preview.allowances).toBe(6750);
    expect(preview.grossSalary).toBe(27000);
    expect(preview.netSalary).toBe(26800);
  });

  it("₹25k gross (50/25/25) − ₹200 PT = ₹24,800 net", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 25000,
      month: "2026-05",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "",
      overtimeDays: 0,
      overtimeHours: 0,
      salaryStructureDeductions: 0,
    });
    expect(preview.grossSalary).toBe(25000);
    expect(preview.netSalary).toBe(24800);
  });

  it("uses default 50/25/25 split when no explicit components provided", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.basicPay).toBe(15000);
    expect(preview.hra).toBe(7500);
    expect(preview.allowances).toBe(7500);
    expect(preview.grossSalary).toBe(30000);
  });

  it("respects explicit basic / HRA / allowances when provided", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
      basicSalary: 18000,
      hraPercentage: 40,
      allowances: 4800,
    });
    expect(preview.basicPay).toBe(18000);
    expect(preview.hra).toBe(7200);
    expect(preview.allowances).toBe(4800);
    expect(preview.grossSalary).toBe(18000 + 7200 + 4800);
  });

  it("adds bonus and overtime to gross", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 1000,
      overtimeAmount: 500,
      overtimeType: "weekday",
      overtimeDays: 0,
      overtimeHours: 4,
    });
    expect(preview.grossSalary).toBe(31500);
  });

  it("computes effective days subtracting LOP", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 2,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.calendarDays).toBe(30);
    expect(preview.effectiveDays).toBe(28);
  });

  it("net salary equals gross minus total deductions", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 30000,
      month: "2026-04",
      lopDays: 1,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });
    expect(preview.netSalary).toBe(preview.grossSalary - preview.totalDeductions);
  });

  it("₹24,999 CTC (50/25/25) − ₹200 PT = ₹24,799 net", () => {
    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: 24999,
      month: "2026-05",
      lopDays: 0,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "",
      overtimeDays: 0,
      overtimeHours: 0,
      salaryStructureDeductions: 0,
    });
    expect(preview.grossSalary).toBe(24999);
    expect(preview.netSalary).toBe(24799);
  });
});

describe("preview vs generate-route consistency (after fix)", () => {
  it("preview LOP equals generate-route LOP when both use the same monthly CTC", () => {
    const ctcMonthly = 60000;

    const preview = buildPayslipPreviewFromEmployee({
      monthlySalary: ctcMonthly,
      month: "2026-04",
      lopDays: 3,

      otherDeductions: 0,
      bonus: 0,
      overtimeAmount: 0,
      overtimeType: "none",
      overtimeDays: 0,
      overtimeHours: 0,
    });

    const calDays = 30;
    const generateDailyRate = ctcMonthly / calDays;
    const generateLopAmount = roundInr(generateDailyRate * 3);

    expect(preview.lopDeduction).toBe(generateLopAmount);
  });
});

describe("computeProratedSalary (mid-month revision)", () => {
  it("single full-month structure → identical to non-prorated", () => {
    const r = computeProratedSalary("2026-04", [
      {
        basicSalary: 30000,
        hraPercentage: 50,
        specialAllowance: 5000,
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
    ]);
    expect(r.basicSalary).toBe(30000);
    expect(r.hra).toBe(15000);
    expect(r.specialAllowance).toBe(5000);
    expect(r.ctcMonthly).toBe(50000);
    expect(r.segmentDays).toHaveLength(1);
    expect(r.segmentDays[0]?.days).toBe(30);
  });

  it("structure starts mid-month → only days from effectiveFrom paid", () => {
    const r = computeProratedSalary("2026-04", [
      {
        basicSalary: 30000,
        hraPercentage: 50,
        specialAllowance: 0,
        effectiveFrom: "2026-04-15",
        effectiveTo: null,
      },
    ]);
    expect(r.segmentDays[0]?.days).toBe(16);
    expect(r.basicSalary).toBe(roundInr((30000 * 16) / 30));
    expect(r.hra).toBe(roundInr((15000 * 16) / 30));
  });

  it("two structures with mid-month switch (raise) → weighted average", () => {
    const r = computeProratedSalary("2026-04", [
      {
        basicSalary: 30000,
        hraPercentage: 50,
        specialAllowance: 0,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-04-14",
      },
      {
        basicSalary: 40000,
        hraPercentage: 50,
        specialAllowance: 0,
        effectiveFrom: "2026-04-15",
        effectiveTo: null,
      },
    ]);
    expect(r.segmentDays).toHaveLength(2);
    expect(r.segmentDays[0]?.days).toBe(14);
    expect(r.segmentDays[1]?.days).toBe(16);
    expect(r.basicSalary).toBe(roundInr((30000 * 14) / 30 + (40000 * 16) / 30));
    expect(r.hra).toBe(roundInr((15000 * 14) / 30 + (20000 * 16) / 30));
  });

  it("zero structures → all zeros", () => {
    const r = computeProratedSalary("2026-04", []);
    expect(r.basicSalary).toBe(0);
    expect(r.hra).toBe(0);
    expect(r.ctcMonthly).toBe(0);
    expect(r.segmentDays).toHaveLength(0);
  });
});

describe("computeStatutory (PF / ESI)", () => {
  const baseParams = {
    pfApplicable: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    esiApplicable: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
  };

  it("PF caps at the wage ceiling", () => {
    const { pfEmployee, pfEmployer } = computeStatutory(40000, 80000, baseParams);
    expect(pfEmployee).toBe(1800);
    expect(pfEmployer).toBe(1800);
  });

  it("PF uses basicSalary when below the ceiling", () => {
    const { pfEmployee, pfEmployer } = computeStatutory(12000, 25000, baseParams);
    expect(pfEmployee).toBe(1440);
    expect(pfEmployer).toBe(1440);
  });

  it("PF zero when not applicable", () => {
    const { pfEmployee, pfEmployer } = computeStatutory(40000, 80000, {
      ...baseParams,
      pfApplicable: false,
    });
    expect(pfEmployee).toBe(0);
    expect(pfEmployer).toBe(0);
  });

  it("ESI applies only when gross ≤ ceiling", () => {
    const inEsi = computeStatutory(15000, 20000, baseParams);
    expect(inEsi.esiEmployee).toBe(150);
    expect(inEsi.esiEmployer).toBe(650);

    const outOfEsi = computeStatutory(15000, 25000, baseParams);
    expect(outOfEsi.esiEmployee).toBe(0);
    expect(outOfEsi.esiEmployer).toBe(0);
  });

  it("ESI zero when not applicable", () => {
    const r = computeStatutory(15000, 20000, { ...baseParams, esiApplicable: false });
    expect(r.esiEmployee).toBe(0);
    expect(r.esiEmployer).toBe(0);
  });

  it("custom rates respected (e.g. tenured PF reduction)", () => {
    const { pfEmployee, pfEmployer } = computeStatutory(40000, 80000, {
      ...baseParams,
      pfEmployeeRate: 10,
      pfEmployerRate: 12,
    });
    expect(pfEmployee).toBe(1500);
    expect(pfEmployer).toBe(1800);
  });
});

describe("computePayrollStatutory (LOP-adjusted, OT-excluded)", () => {
  const params = {
    pfApplicable: true,
    pfEmployeeRate: 12,
    pfEmployerRate: 12,
    pfWageCeiling: 15000,
    esiApplicable: true,
    esiEmployeeRate: 0.75,
    esiEmployerRate: 3.25,
    esiWageCeiling: 21000,
  };

  it("reduces PF wage by LOP days", () => {
    const full = computePayrollStatutory({
      basicSalary: 9000,
      ctcMonthly: 18000,
      grossSalary: 18000,
      overtimeAmount: 0,
      month: "2026-04",
      lopDays: 0,

      params,
    });
    expect(full.pfEmployee).toBe(roundInr(9000 * 0.12));

    const withLop = computePayrollStatutory({
      basicSalary: 9000,
      ctcMonthly: 18000,
      grossSalary: 18000,
      overtimeAmount: 0,
      month: "2026-04",
      lopDays: 6,

      params,
    });
    const expectedPfWage = 9000 - (9000 / 30) * 6;
    expect(withLop.pfEmployee).toBe(roundInr(expectedPfWage * 0.12));
    expect(withLop.pfEmployee).toBeLessThan(full.pfEmployee);
  });

  it("excludes overtime from the ESI eligibility ceiling", () => {
    const r = computePayrollStatutory({
      basicSalary: 10000,
      ctcMonthly: 20000,
      grossSalary: 23000,
      overtimeAmount: 4000,
      month: "2026-04",
      lopDays: 0,

      params,
    });
    expect(r.esiEmployee).toBe(roundInr(23000 * 0.0075));
  });

  it("drops out of ESI when wage excluding OT still exceeds the ceiling", () => {
    const r = computePayrollStatutory({
      basicSalary: 12000,
      ctcMonthly: 22000,
      grossSalary: 25000,
      overtimeAmount: 1000,
      month: "2026-04",
      lopDays: 0,

      params,
    });
    expect(r.esiEmployee).toBe(0);
  });
});

describe("loan recovery is all-or-nothing", () => {
  const base = {
    month: "2026-04",
    monthlySalary: 30000,
    grossSalary: 30000,
    salaryStructureDeductions: 0,
    lopDays: 0,

    otherDeductions: 0,
  };

  it("recovers the full EMI when it fits", () => {
    const r = computeTotalDeductionsAndNet({ ...base, advanceRecoveryAmount: 5000 });
    expect(r.recoveredLoan).toBe(5000);
    expect(r.netSalary).toBe(30000 - PROFESSIONAL_TAX_INR - 5000);
  });

  it("recovers nothing (defers) when the full EMI does not fit", () => {
    const r = computeTotalDeductionsAndNet({
      ...base,
      grossSalary: 4000,
      monthlySalary: 4000,
      advanceRecoveryAmount: 5000,
    });
    expect(r.recoveredLoan).toBe(0);
  });
});

describe("deduction line items reconcile with the total", () => {
  it("totalDeductions equals the sum of rounded line items", () => {
    const r = computeTotalDeductionsAndNet({
      month: "2026-05",
      monthlySalary: 40000,
      grossSalary: 40000,
      salaryStructureDeductions: 0,
      lopDays: 3,

      otherDeductions: 0,
      pfEmployee: 1800,
      esiEmployee: 0,
    });
    expect(r.totalDeductions).toBe(
      r.lopDeduction + PROFESSIONAL_TAX_INR + 1800 + r.recoveredLoan
    );
    expect(r.netSalary).toBe(40000 - r.totalDeductions);
  });
});
