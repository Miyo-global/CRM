import { describe, expect, it } from "vitest";
import { payrollStatusEnum } from "@/lib/db/schema/enums";
import { PAYROLL_SUMMARY_STATUSES, payrollSummaryMonths } from "./summary";

describe("payroll summary", () => {
  it("only filters on statuses the enum has", () => {
    for (const s of PAYROLL_SUMMARY_STATUSES) expect(payrollStatusEnum.enumValues).toContain(s);
  });

  it("rolls the previous month back over the year", () => {
    expect(payrollSummaryMonths(new Date(2026, 0, 15))).toEqual({ current: "2026-01", previous: "2025-12" });
    expect(payrollSummaryMonths(new Date(2026, 9, 31))).toEqual({ current: "2026-10", previous: "2026-09" });
  });
});
