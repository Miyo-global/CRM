import { describe, expect, it } from "vitest";
import { applyBonusFilters, computeBonusStats } from "./bonus-filters";
import type { BonusRow } from "./bonus-filters";

function bonus(overrides: Partial<BonusRow> & Pick<BonusRow, "id">): BonusRow {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "u1",
    employeeName: overrides.employeeName ?? "Test User",
    amount: overrides.amount ?? "1000",
    type: overrides.type ?? "PERFORMANCE",
    reason: overrides.reason ?? null,
    month: overrides.month ?? null,
    status: overrides.status ?? "PENDING",
    approvedAt: overrides.approvedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-06-19T10:00:00.000Z",
  };
}

describe("applyBonusFilters", () => {
  it("filters by status, type, and search", () => {
    const rows = [
      bonus({ id: 1, status: "PENDING", type: "PERFORMANCE", employeeName: "Alpha" }),
      bonus({ id: 2, status: "PAID", type: "FESTIVAL", employeeName: "Beta" }),
    ];

    expect(
      applyBonusFilters(rows, {
        search: "beta",
        status: "PAID",
        type: "FESTIVAL",
        userId: "ALL",
        dateFrom: "",
        dateTo: "",
      }).map((row) => row.id),
    ).toEqual([2]);
  });
});

describe("computeBonusStats", () => {
  it("aggregates counts and amounts", () => {
    const stats = computeBonusStats([
      bonus({ id: 1, amount: "100", status: "PENDING" }),
      bonus({ id: 2, amount: "200", status: "PAID" }),
    ]);

    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.paid).toBe(1);
    expect(stats.totalAmount).toBe(300);
    expect(stats.paidAmount).toBe(200);
    expect(stats.pendingAmount).toBe(100);
  });
});
