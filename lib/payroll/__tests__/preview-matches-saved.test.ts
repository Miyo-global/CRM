import { describe, expect, it } from "vitest";
import { computePayroll, type PayrollComputeInput } from "../compute";
import { payrollRowValues } from "../to-row";

/**
 * A3: the preview endpoint and the generate routes call the same loader and the
 * same pure function, so the saved record is the previewed breakdown. These
 * fixtures assert that for every component, deduction and the net.
 */
const FIXTURES: PayrollComputeInput[] = [8000, 10000, 11000, 25000, 50000].map((monthlySalary) => ({
  month: "2026-10",
  monthlySalary,
  joiningDate: "2026-10-01",
  todayIst: "2026-11-01",
  lopDays: 1,
  paidLeaveDays: 1,
  overtimeDays: 1,
  overtimeAmount: 500,
  bonus: 250,
  otherDeductions: 100,
  structureDeductions: 50,
  advanceRecoveryAmount: 0,
}));

describe("preview equals the saved record", () => {
  it.each(FIXTURES)("salary $monthlySalary", (input) => {
    const preview = computePayroll(input);
    const generated = computePayroll(input);

    expect(generated).toEqual(preview);

    const row = payrollRowValues(generated, { orgId: "o1", userId: "u1", generatedBy: "u0" });
    expect(row.netSalary).toBe(preview.netSalary.toString());
    expect(row.grossSalary).toBe(preview.grossSalary.toString());
    expect(row.ptAmount).toBe(preview.professionalTax.toString());
    expect(row.lopAmount).toBe(preview.lopDeduction.toString());
    expect(row.lopDays).toBe(preview.lopDays.toString());
    expect(row.basicSalary).toBe(preview.basicSalary.toString());
    expect(row.hra).toBe(preview.hra.toString());
    expect(row.specialAllowance).toBe(preview.specialAllowance.toString());
    expect(row.deductions).toBe(preview.totalDeductions.toString());
  });

  it("nets gross minus every deduction", () => {
    for (const input of FIXTURES) {
      const r = computePayroll(input);
      expect(r.grossSalary).toBeCloseTo(r.earnedSalary + r.bonus + r.overtimeAmount, 2);
      expect(r.totalDeductions).toBeCloseTo(
        r.lopDeduction +
          r.professionalTax +
          r.pfEmployee +
          r.esiEmployee +
          r.structureDeductions +
          r.otherDeductions +
          r.advanceRecoveryAmount,
        2,
      );
      expect(r.netSalary).toBeCloseTo(r.grossSalary - r.totalDeductions, 2);
    }
  });
});
