import { describe, expect, it } from "vitest";
import { uniqueLeaveBalances } from "./unique-leave-balances";

describe("uniqueLeaveBalances (R3-PRJ-08)", () => {
  it("keeps the oldest row per leave type", () => {
    const rows = [
      { id: 9, leaveTypeId: 1, balance: "12" },
      { id: 3, leaveTypeId: 1, balance: "3" },
      { id: 4, leaveTypeId: 2, balance: "6" },
    ];
    expect(uniqueLeaveBalances(rows)).toEqual([
      { id: 3, leaveTypeId: 1, balance: "3" },
      { id: 4, leaveTypeId: 2, balance: "6" },
    ]);
  });
});
