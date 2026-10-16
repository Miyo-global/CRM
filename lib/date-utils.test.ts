import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "./date-utils";

describe("formatCalendarDate", () => {
  it("never shifts a bare calendar date", () => {
    expect(formatCalendarDate("2026-10-16")).toBe("16 Oct 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("is empty for no value", () => {
    expect(formatCalendarDate(null)).toBe("");
  });
});
