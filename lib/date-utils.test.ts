import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { format, getDaysInMonth } from "date-fns";
import {
  addDaysToDateString,
  daysBetweenDateStrings,
  formatCalendarDate,
  formatCalendarRange,
  formatDisplayDate,
  formatIST,
  getTodayString,
  isDateOnly,
  monthKeyToDate,
  parseCalendarDate,
  parseDbTimestamp,
  subtractYearsFromDateString,
  zonedDayStartUtc,
} from "./date-utils";

describe("formatCalendarRange (P3-leave-approvals-date-format-inconsistent)", () => {
  it("formats one day, a same-year span and a cross-year span alike", () => {
    expect(formatCalendarRange("2026-11-03", "2026-11-03", "en-GB")).toBe("3 Nov 2026");
    expect(formatCalendarRange("2026-10-28", null, "en-GB")).toBe("28 Oct 2026");
    expect(formatCalendarRange("2026-10-28", "2026-10-29", "en-GB")).toBe("28 Oct – 29 Oct 2026");
    expect(formatCalendarRange("2026-12-30", "2027-01-02", "en-GB")).toBe("30 Dec 2026 – 2 Jan 2027");
  });
});

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

/**
 * R3-TZ-01: date-only values and "today" must not depend on the runtime
 * timezone. Each case runs with the process in New York, India and UTC, at
 * instants either side of local and IST midnight. DEFAULT_TIMEZONE (the org
 * timezone) is Asia/Kolkata.
 */
describe.each(["America/New_York", "Asia/Calcutta", "UTC"])("date-only helpers with TZ=%s (R3-TZ-01)", (tz) => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = tz;
  });
  afterAll(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  it.each([
    // QA run: Fri 23 Oct 15:55 New York = Sat 24 Oct 01:25 IST.
    ["2026-10-23T19:55:00Z", "2026-10-24", "2026-10-23"],
    // One minute before / at IST midnight.
    ["2026-10-23T18:29:00Z", "2026-10-23", "2026-10-23"],
    ["2026-10-23T18:30:00Z", "2026-10-24", "2026-10-23"],
    // New York midnight.
    ["2026-10-24T03:59:00Z", "2026-10-24", "2026-10-23"],
    ["2026-10-24T04:00:00Z", "2026-10-24", "2026-10-24"],
  ])("at %s today is %s in the org tz (%s in New York)", (instant, orgToday, nyToday) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    expect(getTodayString()).toBe(orgToday);
    expect(getTodayString("America/New_York")).toBe(nyToday);
    vi.useRealTimers();
  });

  it("parses and shows a calendar date on its own day", () => {
    expect(format(parseCalendarDate("1995-05-05"), "yyyy-MM-dd")).toBe("1995-05-05");
    expect(formatCalendarDate("2026-10-01")).toBe("1 Oct 2026");
    expect(formatCalendarDate("2020-01-01", { month: "short", day: "numeric" }, "en-US")).toBe("Jan 1");
    expect(formatDisplayDate("2026-10-01")).toBe("1 Oct 2026");
    expect(formatDisplayDate("2099-12-31")).toBe("31 Dec 2099");
  });

  it("does calendar arithmetic without DST drift", () => {
    expect(addDaysToDateString("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToDateString("2026-11-01", 1)).toBe("2026-11-02"); // US DST ends
    expect(addDaysToDateString("2026-03-08", 1)).toBe("2026-03-09"); // US DST starts
    expect(addDaysToDateString("2026-01-01", -1)).toBe("2025-12-31");
    expect(daysBetweenDateStrings("2026-10-24", "2026-12-23")).toBe(60); // R3-EMP-13
    expect(daysBetweenDateStrings("2026-03-01", "2026-04-01")).toBe(31);
  });

  it("finds the 18th birthday, 29 Feb included (R3-ONB-06)", () => {
    expect(subtractYearsFromDateString("2026-10-24", 18)).toBe("2008-10-24");
    expect(subtractYearsFromDateString("2024-02-29", 1)).toBe("2023-02-28");
  });

  it("recognises real calendar dates only", () => {
    expect(isDateOnly("2026-10-24")).toBe(true);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-10-24T00:00:00Z")).toBe(false);
    expect(isDateOnly(undefined)).toBe(false);
  });
});

describe("zonedDayStartUtc (audit log From/To in IST)", () => {
  it("starts an IST day at 18:30 UTC the evening before, whatever the server clock", () => {
    expect(zonedDayStartUtc("2026-10-24").toISOString()).toBe("2026-10-23T18:30:00.000Z");
    expect(zonedDayStartUtc("2026-01-01", "Asia/Kolkata").toISOString()).toBe("2025-12-31T18:30:00.000Z");
  });

  it("an event at 00:10 IST on the 24th falls inside the 24th, not the 23rd", () => {
    const event = new Date("2026-10-23T18:40:00Z"); // 00:10 IST, 24 Oct
    expect(event >= zonedDayStartUtc("2026-10-24")).toBe(true);
    expect(event < zonedDayStartUtc(addDaysToDateString("2026-10-24", 1))).toBe(true);
    expect(event < zonedDayStartUtc(addDaysToDateString("2026-10-23", 1))).toBe(false);
  });

  it("handles a timezone with DST", () => {
    expect(zonedDayStartUtc("2026-07-01", "America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(zonedDayStartUtc("2026-01-01", "America/New_York").toISOString()).toBe("2026-01-01T05:00:00.000Z");
  });
});
