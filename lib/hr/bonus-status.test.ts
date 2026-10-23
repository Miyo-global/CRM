import { describe, expect, it } from "vitest";
import { bonusTransitionError, canMoveBonus } from "./bonus-status";

describe("bonus lifecycle (R2-CRUD-05)", () => {
  it("needs approval before payment", () => {
    expect(bonusTransitionError("PENDING", "PAID")).toBe("Approve the bonus before marking it paid.");
    expect(bonusTransitionError(null, "PAID")).toBe("Approve the bonus before marking it paid.");
    expect(canMoveBonus("PENDING", "APPROVED")).toBe(true);
    expect(canMoveBonus("APPROVED", "PAID")).toBe(true);
  });

  it("cancels pending or approved bonuses only", () => {
    expect(canMoveBonus("PENDING", "CANCELLED")).toBe(true);
    expect(canMoveBonus("APPROVED", "CANCELLED")).toBe(true);
    expect(bonusTransitionError("PAID", "CANCELLED")).toBe("Bonus has already been paid.");
  });

  it("treats paid, rejected and cancelled as final", () => {
    for (const to of ["APPROVED", "PAID", "REJECTED"] as const) {
      expect(canMoveBonus("PAID", to)).toBe(false);
      expect(canMoveBonus("REJECTED", to)).toBe(false);
      expect(canMoveBonus("CANCELLED", to)).toBe(false);
    }
  });
});
