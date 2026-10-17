import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatIST, parseDbTimestamp } from "./date-utils";

describe("formatCalendarDate", () => {
  it("never shifts a bare calendar date", () => {
    expect(formatCalendarDate("2026-10-16")).toBe("16 Oct 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("is empty for no value", () => {
    expect(formatCalendarDate(null)).toBe("");
  });
});

describe("parseDbTimestamp (MIYO-0069/0073)", () => {
  it("reads a naive DB timestamp as UTC", () => {
    expect(parseDbTimestamp("2026-10-15 03:20:00").toISOString()).toBe("2026-10-15T03:20:00.000Z");
    expect(parseDbTimestamp("2026-10-15T03:20:00.123").toISOString()).toBe("2026-10-15T03:20:00.123Z");
  });

  it("keeps an explicit offset", () => {
    expect(parseDbTimestamp("2026-10-15T08:50:00+05:30").toISOString()).toBe("2026-10-15T03:20:00.000Z");
  });

  it("shows the payroll example in IST", () => {
    expect(formatIST("2026-10-15T03:20:00Z")).toMatch(/15 Oct 2026, 8:50\s?am/i);
  });
});
