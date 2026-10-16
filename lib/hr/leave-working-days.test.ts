import { describe, expect, it } from "vitest";
import { countWorkingDays, isNonWorkingRange, workingDates } from "./leave-working-days";

describe("countWorkingDays", () => {
  it("counts Saturday as a working day and skips Sunday", () => {
    // 2026-10-23 Fri .. 2026-10-27 Tue — 25 Oct is a Sunday.
    expect(countWorkingDays("2026-10-23", "2026-10-27")).toBe(4);
  });

  it("subtracts declared holidays", () => {
    expect(countWorkingDays("2026-10-19", "2026-10-21", { holidays: ["2026-10-20"] })).toBe(2);
  });

  it("is half a day for a half-day request", () => {
    expect(countWorkingDays("2026-10-19", "2026-10-19", { isHalfDay: true })).toBe(0.5);
  });

  it("is 0 for a reversed or empty range", () => {
    expect(countWorkingDays("2026-10-21", "2026-10-19")).toBe(0);
    expect(countWorkingDays("", "")).toBe(0);
  });

  it("reports a range that is entirely non-working", () => {
    expect(isNonWorkingRange("2026-10-25", "2026-10-25")).toBe(true);
    expect(workingDates("2026-10-19", "2026-10-20", ["2026-10-20"])).toEqual(["2026-10-19"]);
  });
});
