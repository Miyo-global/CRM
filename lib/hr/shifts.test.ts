import { describe, expect, it } from "vitest";
import { currentAssignment, formatShiftDays, formatShiftWindow, planAssignment } from "./shifts";

describe("formatShiftDays", () => {
  it("collapses runs", () => {
    expect(formatShiftDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(formatShiftDays([0, 6])).toBe("Sun, Sat");
    expect(formatShiftDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(formatShiftDays([1, 2, 4])).toBe("Mon, Tue, Thu");
  });
});

describe("formatShiftWindow", () => {
  it("flags overnight shifts", () => {
    expect(formatShiftWindow("09:00:00", "18:00:00")).toBe("09:00–18:00");
    expect(formatShiftWindow("22:00:00", "06:00:00")).toBe("22:00–06:00 (overnight)");
  });
});

describe("currentAssignment", () => {
  const rows = [
    { id: 1, effectiveFrom: "2026-01-01", effectiveTo: "2026-05-31" },
    { id: 2, effectiveFrom: "2026-06-01", effectiveTo: null },
    { id: 3, effectiveFrom: "2026-12-01", effectiveTo: null },
  ];
  it("picks the one in force", () => {
    expect(currentAssignment(rows, "2026-03-10")?.id).toBe(1);
    expect(currentAssignment(rows, "2026-10-28")?.id).toBe(2);
    expect(currentAssignment(rows, "2025-12-31")).toBeNull();
  });
});

describe("planAssignment", () => {
  it("closes an earlier open-ended assignment the day before", () => {
    const r = planAssignment([{ id: 1, effectiveFrom: "2026-01-01", effectiveTo: null }], "2026-03-01", null);
    expect(r).toEqual({ ok: true, close: [{ id: 1, effectiveTo: "2026-02-28" }] });
  });
  it("rejects other overlaps", () => {
    expect(planAssignment([{ id: 1, effectiveFrom: "2026-03-01", effectiveTo: null }], "2026-03-01", null))
      .toEqual({ ok: false, conflictId: 1 });
    expect(planAssignment([{ id: 2, effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30" }], "2026-03-01", null))
      .toEqual({ ok: false, conflictId: 2 });
  });
  it("allows non-overlapping ranges", () => {
    expect(planAssignment([{ id: 1, effectiveFrom: "2026-01-01", effectiveTo: "2026-02-28" }], "2026-03-01", "2026-03-31"))
      .toEqual({ ok: true, close: [] });
  });
});
