import { describe, expect, it } from "vitest";

import { expenseStatusUpdateSchema, expenseTransitionError } from "./expense-status";

describe("expense status changes (R3-HR-01)", () => {
  it("lets an approved claim be reimbursed", () => {
    expect(expenseTransitionError("APPROVED", "PAID")).toBeNull();
  });

  it("decides a pending claim either way", () => {
    expect(expenseTransitionError("PENDING", "APPROVED")).toBeNull();
    expect(expenseTransitionError("PENDING", "REJECTED")).toBeNull();
    expect(expenseTransitionError(null, "APPROVED")).toBeNull();
  });

  it("refuses the rest with a message rather than throwing", () => {
    expect(expenseTransitionError("PENDING", "PAID")).toMatch(/approved claim/);
    expect(expenseTransitionError("PAID", "PAID")).toMatch(/already been reimbursed/);
    expect(expenseTransitionError("APPROVED", "APPROVED")).toMatch(/already been processed/);
    expect(expenseTransitionError("REJECTED", "PAID")).toMatch(/approved claim/);
  });

  it("reads REIMBURSED as PAID and names a bad status", () => {
    expect(expenseStatusUpdateSchema.parse({ status: "REIMBURSED" }).status).toBe("PAID");
    const bad = expenseStatusUpdateSchema.safeParse({ status: "DONE" });
    expect(bad.success).toBe(false);
    expect(bad.error?.flatten().fieldErrors.status?.[0]).toMatch(/Reimbursed/);
  });
});
