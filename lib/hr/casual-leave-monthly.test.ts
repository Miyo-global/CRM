import { describe, expect, it } from "vitest";
import {
  casualCarryFromPreviousMonth,
  casualMaxUsableInMonth,
  monthsSpannedByDateRange,
  previousCalendarMonth,
} from "./casual-leave-monthly";

describe("casualCarryFromPreviousMonth", () => {
  it("carries a full day when prior month unused", () => {
    expect(casualCarryFromPreviousMonth(0)).toBe(1);
  });

  it("carries nothing when prior month used fully", () => {
    expect(casualCarryFromPreviousMonth(1)).toBe(0);
    expect(casualCarryFromPreviousMonth(2)).toBe(0);
  });

  it("carries the unused fraction", () => {
    expect(casualCarryFromPreviousMonth(0.5)).toBe(0.5);
  });
});

describe("casualMaxUsableInMonth", () => {
  it("allows 2 when prior month unused", () => {
    expect(casualMaxUsableInMonth(0)).toBe(2);
  });

  it("allows 1 when prior month already used", () => {
    expect(casualMaxUsableInMonth(1)).toBe(1);
  });
});

describe("previousCalendarMonth / monthsSpannedByDateRange", () => {
  it("rolls year for January", () => {
    expect(previousCalendarMonth(2026, 0)).toEqual({
      year: 2025,
      monthIndex0: 11,
      yyyyMm: "2025-12",
    });
  });

  it("lists months in a range", () => {
    expect(monthsSpannedByDateRange("2026-01-28", "2026-03-02")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});
