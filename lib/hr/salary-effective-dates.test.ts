import { describe, expect, it } from "vitest";
import {
  pickSalaryStructureForPayrollMonth,
  snapSalaryEffectiveFrom,
  dayBeforeIsoDate,
  componentsFromStructureRow,
  resolvePayrollMonthlyCtc,
} from "./salary-effective-dates";

describe("snapSalaryEffectiveFrom", () => {
  it("keeps date when already first of month", () => {
    expect(snapSalaryEffectiveFrom("2026-02-01")).toBe("2026-02-01");
  });

  it("snaps mid-month to first of next month", () => {
    expect(snapSalaryEffectiveFrom("2026-01-15")).toBe("2026-02-01");
  });
});

describe("dayBeforeIsoDate", () => {
  it("returns previous calendar day", () => {
    expect(dayBeforeIsoDate("2026-02-01")).toBe("2026-01-31");
  });
});

describe("pickSalaryStructureForPayrollMonth", () => {
  it("picks latest overlapping structure for the month", () => {
    const picked = pickSalaryStructureForPayrollMonth(
      [
        {
          effectiveFrom: "2025-12-01",
          effectiveTo: "2026-01-31",
          basicSalary: "10000",
          hraPercentage: "50",
          specialAllowance: "0",
        },
        {
          effectiveFrom: "2026-02-01",
          effectiveTo: null,
          basicSalary: "20000",
          hraPercentage: "50",
          specialAllowance: "0",
        },
      ],
      "2026-01"
    );
    expect(picked?.basicSalary).toBe("10000");
  });

  it("picks newer structure when month is after its effective date", () => {
    const picked = pickSalaryStructureForPayrollMonth(
      [
        {
          effectiveFrom: "2025-12-01",
          effectiveTo: "2026-01-31",
          basicSalary: "10000",
          hraPercentage: "50",
          specialAllowance: "0",
        },
        {
          effectiveFrom: "2026-02-01",
          effectiveTo: null,
          basicSalary: "20000",
          hraPercentage: "50",
          specialAllowance: "0",
        },
      ],
      "2026-02"
    );
    expect(picked?.basicSalary).toBe("20000");
  });
});

describe("resolvePayrollMonthlyCtc", () => {
  const row = (basic: string, special = "0") =>
    ({
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      basicSalary: basic,
      hraPercentage: "50",
      specialAllowance: special,
    }) as const;

  it("uses max(structure CTC, employee monthly) when both exist", () => {
    const picked = row("12500", "0");
    const structureCtc = componentsFromStructureRow(picked).ctcMonthly;
    expect(structureCtc).toBe(18750);
    const ctc = resolvePayrollMonthlyCtc({
      picked,
      fallbackStructure: null,
      employeeMonthlySalary: 24999,
    });
    expect(ctc).toBe(24999);
  });

  it("uses employee monthly when no picked row", () => {
    expect(
      resolvePayrollMonthlyCtc({
        picked: null,
        fallbackStructure: null,
        employeeMonthlySalary: 24000,
      })
    ).toBe(24000);
  });

  it("uses fallback structure CTC when no pick and no employee monthly", () => {
    const fb = row("10000", "5000");
    expect(
      resolvePayrollMonthlyCtc({
        picked: null,
        fallbackStructure: fb,
        employeeMonthlySalary: 0,
      })
    ).toBe(componentsFromStructureRow(fb).ctcMonthly);
  });
});
