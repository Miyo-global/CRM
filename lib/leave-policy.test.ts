import { describe, expect, it } from "vitest";
import { LEAVE_POLICY, leaveBalanceRow, leaveTypeLimitHint } from "./leave-policy";

describe("leaveBalanceRow (R3-EMP-12)", () => {
  it("takes pending days off Available, matching the request dialog", () => {
    expect(leaveBalanceRow(12, 12, 2)).toEqual({ available: 10, total: 12, used: 0, pending: 2 });
  });

  it("counts used days from the balance, not from pending", () => {
    expect(leaveBalanceRow(9, 12, 1)).toEqual({ available: 8, total: 12, used: 3, pending: 1 });
  });

  it("never shows a negative Available", () => {
    expect(leaveBalanceRow(1, 12, 3).available).toBe(0);
  });
});

describe("leaveTypeLimitHint (R3-EMP-12)", () => {
  it("states the casual yearly and monthly caps", () => {
    const hint = leaveTypeLimitHint(LEAVE_POLICY.CASUAL.name)!;
    expect(hint).toContain(`${LEAVE_POLICY.CASUAL.daysPerYear} days a year`);
    expect(hint).toContain("next month only");
  });

  it("states the sick leave cap and nothing for unpaid", () => {
    expect(leaveTypeLimitHint(LEAVE_POLICY.SICK.name)).toBe(`Up to ${LEAVE_POLICY.SICK.daysPerYear} days a year.`);
    expect(leaveTypeLimitHint(LEAVE_POLICY.UNPAID.name)).toBeNull();
  });
});
