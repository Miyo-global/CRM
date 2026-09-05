import { describe, expect, it } from "vitest";
import { buildPayslipViewModelFromPayroll, toWordsInr } from "./payslip-view-model";

type Payroll = Parameters<typeof buildPayslipViewModelFromPayroll>[0];
type Employee = Parameters<typeof buildPayslipViewModelFromPayroll>[1];
type Org = Parameters<typeof buildPayslipViewModelFromPayroll>[2];

/** A payroll row with every optional column absent — the shape the database
 *  actually returns for an org that does not run PF/ESI/overtime. */
function payroll(overrides: Partial<Payroll> = {}): Payroll {
  return {
    month: "2026-03",
    basicSalary: "50000",
    hra: "20000",
    allowances: "0",
    overtimeType: null,
    overtimeDays: null,
    overtimeHours: null,
    overtimeAmount: null,
    grossSalary: "70000",
    deductions: "0",
    netSalary: "70000",
    ptAmount: null,
    lopDays: null,
    halfDays: null,
    ...overrides,
  } as Payroll;
}

const employee: Employee = {
  name: "Asha Rao",
  employeeId: "MG-001",
  designation: "Engineer",
  joiningDate: "2025-01-06",
  taxId: "ABCDE1234F",
  bankDetails: null,
};

const org: Org = { name: "Miyo Global", address: null };

describe("itemised deductions reconcile with the stated total", () => {
  it("does not invent a professional tax line when the column is null", () => {
    const vm = buildPayslipViewModelFromPayroll(
      payroll({ ptAmount: null, deductions: "0", netSalary: "70000" }),
      employee,
      org,
    );

    // The stored total is 0, so nothing may appear in the itemised list —
    // otherwise the payslip contradicts itself in front of the employee.
    expect(vm.deductions).toEqual([]);
    expect(vm.totalDeductions).toBe(0);
  });

  it("keeps the itemised lines summing to the stated total", () => {
    const vm = buildPayslipViewModelFromPayroll(
      payroll({ ptAmount: "200", deductions: "200", netSalary: "69800" }),
      employee,
      org,
    );

    const sum = vm.deductions.reduce((t, line) => t + line.amount, 0);
    expect(sum).toBe(vm.totalDeductions);
    expect(vm.netSalary).toBe(69800);
  });
});

describe("malformed pay month", () => {
  it("does not silently invent a plausible-looking month", () => {
    const vm = buildPayslipViewModelFromPayroll(
      payroll({ month: "not-a-month" }),
      employee,
      org,
    );

    // "January 2001" on a payslip is worse than an obvious placeholder: it
    // looks correct, so nobody catches it.
    expect(vm.monthLabel).not.toBe("January 2001");
    expect(vm.monthLabel).toBe("Unknown Month");
  });

  it("still reports a usable day count", () => {
    const vm = buildPayslipViewModelFromPayroll(
      payroll({ month: "not-a-month" }),
      employee,
      org,
    );
    expect(Number.isFinite(vm.daysInPayMonth)).toBe(true);
    expect(vm.daysInPayMonth).toBeGreaterThan(0);
  });

  it("resolves real months correctly, including a leap February", () => {
    expect(
      buildPayslipViewModelFromPayroll(payroll({ month: "2026-02" }), employee, org).daysInPayMonth,
    ).toBe(28);
    expect(
      buildPayslipViewModelFromPayroll(payroll({ month: "2024-02" }), employee, org).daysInPayMonth,
    ).toBe(29);
    expect(
      buildPayslipViewModelFromPayroll(payroll({ month: "2026-03" }), employee, org).monthLabel,
    ).toBe("March 2026");
  });
});

describe("toWordsInr", () => {
  it("writes the Indian numbering system correctly", () => {
    expect(toWordsInr(0)).toBe("Zero Rupees Only");
    expect(toWordsInr(1)).toBe("One Rupees Only");
    expect(toWordsInr(19)).toBe("Nineteen Rupees Only");
    expect(toWordsInr(100)).toBe("One Hundred Rupees Only");
    expect(toWordsInr(1234567)).toBe(
      "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only",
    );
    expect(toWordsInr(10000000)).toBe("One Crore Rupees Only");
  });

  it("names a negative amount instead of emitting an empty phrase", () => {
    // A net can go negative when an advance recovery exceeds the month's pay.
    // The old output was the bare string " Rupees Only" — meaningless on a
    // document an employee may have to show a bank.
    expect(toWordsInr(-500)).toBe("Minus Five Hundred Rupees Only");
  });

  it("ignores paise rather than rounding up to a rupee the payslip did not pay", () => {
    expect(toWordsInr(500.99)).toBe("Five Hundred Rupees Only");
  });
});
