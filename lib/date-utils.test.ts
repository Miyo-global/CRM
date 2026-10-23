import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { format, getDaysInMonth } from "date-fns";
import { formatCalendarDate, formatIST, monthKeyToDate, parseCalendarDate, parseDbTimestamp } from "./date-utils";

describe("monthKeyToDate (R2-PAY-01)", () => {
  // West of UTC `new Date("2026-10-01")` is still 30 September locally, which
  // put the payroll title and drawer one month behind the picker.
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it.each([
    ["2026-09", "September 2026", "01 Sep 2026 – 30 Sep 2026"],
    ["2026-10", "October 2026", "01 Oct 2026 – 31 Oct 2026"],
    ["2026-11", "November 2026", "01 Nov 2026 – 30 Nov 2026"],
  ])("%s labels and spans the picked month", (month, label, period) => {
    const start = monthKeyToDate(month);
    const end = new Date(start.getFullYear(), start.getMonth(), getDaysInMonth(start));
    expect(format(start, "MMMM yyyy")).toBe(label);
    expect(`${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`).toBe(period);
  });

  it("parseCalendarDate keeps a YYYY-MM-DD date on its day (R2-EMP-05)", () => {
    expect(format(parseCalendarDate("2026-10-24"), "MMM d")).toBe("Oct 24");
  });
});

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
