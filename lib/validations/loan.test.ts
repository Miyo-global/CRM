import { describe, it, expect } from "vitest";
import { createLoanSchema, MAX_LOAN_EMIS, LOAN_REASON_MAX } from "./loan";

describe("createLoanSchema (R2-CRUD-09)", () => {
  const ok = { amount: 5000, reason: "Medical", totalEmis: 6 };

  it("accepts a sensible request", () => {
    expect(createLoanSchema.safeParse(ok).success).toBe(true);
  });

  it.each([
    ["negative amount", { ...ok, amount: -100 }],
    ["zero amount", { ...ok, amount: 0 }],
    ["too many EMIs", { ...ok, totalEmis: MAX_LOAN_EMIS + 1 }],
    ["fractional EMIs", { ...ok, totalEmis: 2.5 }],
    ["blank reason", { ...ok, reason: "   " }],
    ["long reason", { ...ok, reason: "x".repeat(LOAN_REASON_MAX + 1) }],
  ])("rejects %s", (_label, input) => {
    expect(createLoanSchema.safeParse(input).success).toBe(false);
  });
});
