import { describe, expect, it } from "vitest";
import { reimbursementDecisionNotice } from "./reimbursement-notice";

describe("reimbursementDecisionNotice (FR1-006)", () => {
  it("tells the employee it was approved", () => {
    expect(reimbursementDecisionNotice({ status: "APPROVED", amount: "500", category: "Travel" })).toMatchObject({
      title: "Reimbursement approved",
      message: "Your reimbursement of ₹500 (Travel) was approved.",
    });
  });

  it("gives the reason on rejection", () => {
    expect(
      reimbursementDecisionNotice({ status: "REJECTED", amount: 1200.5, category: "Meals", rejectionReason: "No receipt" }).message,
    ).toBe("Your reimbursement of ₹1,200.5 (Meals) was not approved. Reason: No receipt");
  });
});
