import { describe, expect, it } from "vitest";
import {
  casualCarryFromPreviousMonth,
  casualDaysExpiringFromEarnMonth,
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

describe("casualDaysExpiringFromEarnMonth", () => {
  it("expires unused earn-month day when also unused in carry month", () => {
    expect(casualDaysExpiringFromEarnMonth(0, 0)).toBe(1);
  });

  it("does not expire when used in earn month", () => {
    expect(casualDaysExpiringFromEarnMonth(1, 0)).toBe(0);
  });

  it("does not expire when carried and used next month", () => {
    expect(casualDaysExpiringFromEarnMonth(0, 1)).toBe(0);
    expect(casualDaysExpiringFromEarnMonth(0, 2)).toBe(0);
  });

  it("expires leftover when only partly used across the window", () => {
    expect(casualDaysExpiringFromEarnMonth(0, 0.5)).toBe(0.5);
    expect(casualDaysExpiringFromEarnMonth(0.5, 0)).toBe(0.5);
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
