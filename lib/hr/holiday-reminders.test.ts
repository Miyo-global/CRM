import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getTomorrowDateString,
  isHolidayTomorrow,
  formatHolidayReminderDate,
} from "./holiday-reminders";

describe("holiday-reminders", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats only the next calendar day (IST) as tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T10:00:00+05:30"));

    expect(getTomorrowDateString()).toBe("2026-06-18");
    expect(isHolidayTomorrow("2026-06-18")).toBe(true);
    expect(isHolidayTomorrow("2026-06-19")).toBe(false);
    expect(isHolidayTomorrow("2026-06-17")).toBe(false);
  });

  it("formats holiday dates for email display", () => {
    expect(formatHolidayReminderDate("2026-06-19")).toContain("2026");
    expect(formatHolidayReminderDate("2026-06-19")).toMatch(/Jun/i);
  });
});
