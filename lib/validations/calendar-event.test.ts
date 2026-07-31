import { describe, it, expect } from "vitest";
import {
  validateCalendarTitle,
  shouldShowMeetConnect,
  shouldShowMeetGenerate,
  isValidUrl,
  CALENDAR_TITLE_MIN,
  CALENDAR_TITLE_MAX,
  getCalendarEventRangeError,
  getCalendarEventFormRangeError,
  CALENDAR_MIN_DURATION_MS,
} from "./calendar-event";

describe("validateCalendarTitle", () => {
  it("rejects empty / whitespace-only titles", () => {
    expect(validateCalendarTitle("")).toMatch(/required/i);
    expect(validateCalendarTitle("   ")).toMatch(/required/i);
  });

  it("rejects titles shorter than the minimum", () => {
    expect(validateCalendarTitle("Hi")).toMatch(/at least/i);
  });

  it("rejects numeric-only and special-character-only titles", () => {
    expect(validateCalendarTitle("12345")).toMatch(/numeric/i);
    expect(validateCalendarTitle("123 45")).toMatch(/numeric/i);
    expect(validateCalendarTitle("!@#$%")).toMatch(/letter/i);
  });

  it("rejects titles longer than the maximum", () => {
    const long = "a".repeat(CALENDAR_TITLE_MAX + 1);
    expect(validateCalendarTitle(long)).toMatch(/at most/i);
  });

  it("rejects titles with disallowed characters (e.g. emoji)", () => {
    expect(validateCalendarTitle("Team sync 😀")).toMatch(/only contain/i);
  });

  it("accepts typical titles at the minimum length", () => {
    const ok = "a".repeat(CALENDAR_TITLE_MIN);
    expect(validateCalendarTitle(ok)).toBeNull();
    expect(validateCalendarTitle("Team sync")).toBeNull();
  });

  it("accepts a valid title at the maximum length", () => {
    const ok = "a".repeat(CALENDAR_TITLE_MAX);
    expect(validateCalendarTitle(ok)).toBeNull();
  });
});

describe("shouldShowMeetConnect", () => {
  it("hides when status is missing", () => {
    expect(shouldShowMeetConnect(null)).toBe(false);
    expect(shouldShowMeetConnect(undefined)).toBe(false);
  });

  it("hides when the integration is not configured (prevents blank OAuth error page)", () => {
    expect(shouldShowMeetConnect({ configured: false, connected: false })).toBe(false);
  });

  it("shows only when configured and not yet connected", () => {
    expect(shouldShowMeetConnect({ configured: true, connected: false })).toBe(true);
  });

  it("hides the Connect button once already connected", () => {
    expect(shouldShowMeetConnect({ configured: true, connected: true })).toBe(false);
  });
});

describe("shouldShowMeetGenerate", () => {
  it("shows only when configured and connected", () => {
    expect(shouldShowMeetGenerate({ configured: true, connected: true })).toBe(true);
    expect(shouldShowMeetGenerate({ configured: true, connected: false })).toBe(false);
    expect(shouldShowMeetGenerate({ configured: false, connected: true })).toBe(false);
    expect(shouldShowMeetGenerate(null)).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("accepts valid URLs and rejects garbage", () => {
    expect(isValidUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
  });
});

describe("getCalendarEventRangeError", () => {
  it("rejects timed events where end is not strictly after start", () => {
    const start = new Date("2025-06-01T10:00:00");
    const endEq = new Date("2025-06-01T10:00:00");
    expect(getCalendarEventRangeError(start, endEq, false)).toMatch(/after start/i);
    const endBefore = new Date("2025-06-01T09:00:00");
    expect(getCalendarEventRangeError(start, endBefore, false)).toMatch(/after start/i);
  });

  it("rejects timed events shorter than the minimum duration", () => {
    const start = new Date("2025-06-01T10:00:00");
    const end = new Date(start.getTime() + CALENDAR_MIN_DURATION_MS - 60_000);
    expect(getCalendarEventRangeError(start, end, false)).toMatch(/15/i);
  });

  it("accepts timed events at least as long as the minimum", () => {
    const start = new Date("2025-06-01T10:00:00");
    const end = new Date(start.getTime() + CALENDAR_MIN_DURATION_MS);
    expect(getCalendarEventRangeError(start, end, false)).toBeNull();
  });

  it("allows all-day when end is on or after start", () => {
    const a = new Date("2025-06-01T00:00:00");
    const b = new Date("2025-06-03T23:59:59");
    expect(getCalendarEventRangeError(a, b, true)).toBeNull();
  });

  it("rejects all-day when end is before start", () => {
    const a = new Date("2025-06-05T00:00:00");
    const b = new Date("2025-06-01T00:00:00");
    expect(getCalendarEventRangeError(a, b, true)).toMatch(/on or after start/i);
  });
});

describe("getCalendarEventFormRangeError", () => {
  it("matches all-day date ordering", () => {
    expect(
      getCalendarEventFormRangeError({
        allDay: true,
        startDate: "2025-06-10",
        endDate: "2025-06-09",
        startTime: "",
        endTime: "",
      })
    ).toMatch(/before start/i);
    expect(
      getCalendarEventFormRangeError({
        allDay: true,
        startDate: "2025-06-10",
        endDate: "2025-06-10",
        startTime: "",
        endTime: "",
      })
    ).toBeNull();
  });

  it("requires times when not all-day", () => {
    expect(
      getCalendarEventFormRangeError({
        allDay: false,
        startDate: "2025-06-01",
        endDate: "2025-06-01",
        startTime: "",
        endTime: "11:00",
      })
    ).toMatch(/Start time is required/i);
  });
});
