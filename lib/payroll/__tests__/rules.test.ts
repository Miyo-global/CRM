import { describe, expect, it } from "vitest";
import {
  emiDueFor,
  employmentWindow,
  overtimeAmountForDays,
  otMultiplier,
  perDayRate,
  professionalTaxFromStored,
  round2,
  splitEarnings,
} from "../rules";
import { computePayroll } from "../compute";

const OCT = "2026-10";

describe("earnings split 50/25/25", () => {
  it.each([8000, 10000, 11000, 25000, 50000])("splits %i", (salary) => {
    const s = splitEarnings(salary);
    expect(s.basicSalary).toBe(salary * 0.5);
    expect(s.hra).toBe(salary * 0.25);
    expect(s.specialAllowance).toBe(salary * 0.25);
    expect(s.basicSalary + s.hra + s.specialAllowance).toBe(salary);
  });
});

describe("full-month net (required payroll table)", () => {
  it.each([
    [8000, 150, 7850],
    [10000, 150, 9850],
    [11000, 150, 10850],
    [25000, 250, 24750],
    [50000, 250, 49750],
  ])("salary %i with PT %i nets %i", (salary, pt, net) => {
    const r = computePayroll({
      month: OCT,
      monthlySalary: salary,
      joiningDate: "2026-10-01",
      lopDays: 0,
      professionalTax: pt,
    });
    expect(r.professionalTax).toBe(pt);
    expect(r.netSalary).toBe(net);
  });
});

describe("employment window (A2 / A37)", () => {
  it("starts at the joining date, never before", () => {
    const w = employmentWindow({ month: OCT, joiningDate: "2026-10-15" });
    expect(w.start).toBe("2026-10-15");
    expect(w.daysEmployed).toBe(17);
  });

  it("never evaluates a day that has not happened yet", () => {
    const w = employmentWindow({ month: OCT, joiningDate: "2026-10-01", todayIst: "2026-10-10" });
    expect(w.end).toBe("2026-10-09");
  });

  it("stops at the exit date", () => {
    const w = employmentWindow({ month: OCT, exitDate: "2026-10-20" });
    expect(w.end).toBe("2026-10-20");
    expect(w.daysEmployed).toBe(20);
  });

  it("is empty when the joining date is after the month end", () => {
    const w = employmentWindow({ month: OCT, joiningDate: "2026-11-02" });
    expect(w.empty).toBe(true);
    expect(w.daysEmployed).toBe(0);
  });
});

describe("LOP and proration (A2 table, October 2026)", () => {
  it("joined 1 Oct, 25,000, all present: LOP 0, net 24,750", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 25000, joiningDate: "2026-10-01", lopDays: 0, professionalTax: 250 });
    expect(r.lopDays).toBe(0);
    expect(r.netSalary).toBe(24750);
  });

  it("joined 15 Oct, 10,000: prorated net 5,333.87", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 10000, joiningDate: "2026-10-15", lopDays: 0, professionalTax: 150 });
    expect(r.netSalary).toBe(5333.87);
  });

  it("joined 15 Oct, 50,000: prorated net 27,169.35", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 50000, joiningDate: "2026-10-15", lopDays: 0, professionalTax: 250 });
    expect(r.earnedSalary).toBe(27419.35);
    expect(r.netSalary).toBe(27169.35);
  });

  it("2 unpaid absences on 20,000: net 18,459.68", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 20000, joiningDate: "2026-10-01", lopDays: 2, professionalTax: 250 });
    expect(r.perDay).toBe(645.16);
    expect(r.netSalary).toBe(18459.68);
  });

  it("OT multiplier falls back to 1x; a stored value wins (MIYO-0016)", () => {
    expect(otMultiplier(null)).toBe(1);
    expect(otMultiplier(undefined)).toBe(1);
    expect(otMultiplier("1.50")).toBe(1.5);
    const perDay = perDayRate(31000);
    expect(overtimeAmountForDays(perDay, 1, otMultiplier(null))).toBe(1000);
  });

  it("per-day is salary / 31 in every month, February included", () => {
    expect(perDayRate(31000)).toBe(1000);
    const feb = computePayroll({ month: "2026-02", monthlySalary: 31000, joiningDate: "2026-02-01", lopDays: 1 });
    expect(feb.perDay).toBe(1000);
  });

  it("overtime 2 days on 33,200 adds 2,141.94", () => {
    const perDay = perDayRate(33200);
    expect(overtimeAmountForDays(perDay, 2)).toBe(2141.94);
    const r = computePayroll({
      month: OCT,
      monthlySalary: 33200,
      joiningDate: "2026-10-01",
      lopDays: 0,
      overtimeDays: 2,
      overtimeAmount: overtimeAmountForDays(perDay, 2),
      professionalTax: 250,
    });
    expect(r.netSalary).toBe(33200 + 2141.94 - 250);
  });

  it("a joiner after month end earns nothing for that month", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 25000, joiningDate: "2026-11-01", lopDays: 3, professionalTax: 200 });
    expect(r.notEmployed).toBe(true);
    expect(r.netSalary).toBe(0);
    expect(r.professionalTax).toBe(0);
    expect(r.lopDays).toBe(0);
  });

  it("gives the same LOP for two employees with the same inputs", () => {
    const input = { month: OCT, monthlySalary: 18000, joiningDate: "2026-10-01", lopDays: 1 } as const;
    expect(computePayroll({ ...input })).toEqual(computePayroll({ ...input }));
  });
});

describe("rounding", () => {
  it("rounds to 2 dp once, at the end", () => {
    const r = computePayroll({ month: OCT, monthlySalary: 10001, joiningDate: "2026-10-07", lopDays: 1 });
    for (const value of Object.values(r)) {
      if (typeof value !== "number") continue;
      expect(Number(value.toFixed(2))).toBe(value);
    }
  });
});

describe("emiDueFor (MIYO-0125)", () => {
  it("collects exactly the loan over its instalments", () => {
    // ₹1,000 over 3 EMIs, stored rounded up to 333.34.
    const loan = { amount: "1000", emiAmount: "333.34", paidEmis: 0 };
    const first = emiDueFor(loan);
    const second = emiDueFor({ ...loan, paidEmis: 1 });
    const third = emiDueFor({ ...loan, paidEmis: 2 });

    expect([first, second, third]).toEqual([333.34, 333.34, 333.32]);
    expect(round2(first + second + third)).toBe(1000);
  });

  it("stops once the loan is paid off", () => {
    expect(emiDueFor({ amount: "1000", emiAmount: "333.34", paidEmis: 3 })).toBe(0);
  });

  it("is zero when no EMI is set", () => {
    expect(emiDueFor({ amount: "1000", emiAmount: null, paidEmis: 0 })).toBe(0);
  });
});

describe("per-employee professional tax", () => {
  const base = { month: OCT, monthlySalary: 50000, joiningDate: "2026-10-01", lopDays: 0 } as const;

  it("deducts the employee's own amount, nothing when 0 or not applicable", () => {
    expect(computePayroll({ ...base, professionalTax: 200 }).netSalary).toBe(49800);
    expect(computePayroll({ ...base, professionalTax: 0 }).netSalary).toBe(50000);
    expect(computePayroll({ ...base, professionalTax: null }).netSalary).toBe(50000);
    expect(computePayroll({ ...base }).professionalTax).toBe(0);
  });

  it("is exact to the paisa (200.50)", () => {
    const r = computePayroll({ ...base, professionalTax: 200.5 });
    expect(r.professionalTax).toBe(200.5);
    expect(r.totalDeductions).toBe(200.5);
    expect(r.netSalary).toBe(49799.5);
  });

  it("two employees in one run each use their own PT", () => {
    expect(computePayroll({ ...base, professionalTax: 200 }).professionalTax).toBe(200);
    expect(computePayroll({ ...base, professionalTax: 300 }).professionalTax).toBe(300);
  });

  it("flags deductions above gross instead of saving a negative net", () => {
    const r = computePayroll({ ...base, monthlySalary: 1000, professionalTax: 200, otherDeductions: 900 });
    expect(r.deductionsExceedGross).toBe(true);
    expect(r.netSalary).toBe(0);
    expect(computePayroll({ ...base, professionalTax: 200 }).deductionsExceedGross).toBe(false);
  });

  it("reads the stored column: NULL and junk deduct 0", () => {
    expect(professionalTaxFromStored(null)).toBe(0);
    expect(professionalTaxFromStored(undefined)).toBe(0);
    expect(professionalTaxFromStored("0.00")).toBe(0);
    expect(professionalTaxFromStored("200.50")).toBe(200.5);
  });
});

describe("payslip PT snapshot", () => {
  it("a saved row keeps its PT when the employee's value changes later", async () => {
    const { payrollRowValues } = await import("../to-row");
    const meta = { orgId: "o", userId: "u", generatedBy: "g" };
    const input = { month: OCT, monthlySalary: 50000, joiningDate: "2026-10-01", lopDays: 0 } as const;
    const saved = payrollRowValues(computePayroll({ ...input, professionalTax: 200 }), meta);
    const nextRun = payrollRowValues(computePayroll({ ...input, professionalTax: 250 }), meta);
    expect(saved.ptAmount).toBe("200");
    expect(saved.netSalary).toBe("49800");
    expect(nextRun.ptAmount).toBe("250");
  });
});

describe("monthlyBreakdown (wizard Confirm step, FR1-004)", () => {
  it("splits the CTC and nets out the employee's PT", async () => {
    const { monthlyBreakdown } = await import("../rules");
    expect(monthlyBreakdown(50000, 200.5)).toEqual({
      basicSalary: 25000,
      hra: 12500,
      specialAllowance: 12500,
      professionalTax: 200.5,
      net: 49799.5,
    });
    expect(monthlyBreakdown(10000, null).net).toBe(10000);
  });
});
