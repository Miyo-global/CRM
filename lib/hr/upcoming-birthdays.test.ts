import { describe, it, expect } from "vitest";
import {
  daysUntilNextBirthday,
  parseDobMonthDay,
  isBirthdayToday,
  isUpcomingBirthdaySoon,
  normalizeDobToYmd,
} from "./upcoming-birthdays";

describe("parseDobMonthDay", () => {
  it("reads YYYY-MM-DD without shifting", () => {
    expect(parseDobMonthDay("1990-05-07")).toEqual({ month: 4, day: 7 });
  });

  it("returns null for invalid input", () => {
    expect(parseDobMonthDay("not-a-date")).toBeNull();
    expect(parseDobMonthDay(null)).toBeNull();
  });

  it("handles Date values (UTC calendar day)", () => {
    const dob = new Date(Date.UTC(1990, 4, 8));
    expect(parseDobMonthDay(dob)).toEqual({ month: 4, day: 8 });
  });
});

describe("normalizeDobToYmd", () => {
  it("strips time from ISO strings", () => {
    expect(normalizeDobToYmd("1990-05-08T12:00:00.000Z")).toBe("1990-05-08");
  });
});

describe("daysUntilNextBirthday", () => {
  it("returns 0 when birthday is today (even later same day)", () => {
    const today = new Date(2026, 4, 7, 15, 30, 0);
    expect(daysUntilNextBirthday("1990-05-07", today)).toBe(0);
  });

  it("returns 1 when birthday is tomorrow", () => {
    const today = new Date(2026, 4, 7, 10, 0, 0);
    expect(daysUntilNextBirthday("1990-05-08", today)).toBe(1);
  });

  it("rolls to next year after this year's date passed", () => {
    const today = new Date(2026, 4, 10, 10, 0, 0);
    expect(daysUntilNextBirthday("1990-05-07", today)).toBeGreaterThan(300);
  });

  it("includes birthdays within 7 days across month boundary", () => {
    const today = new Date(2026, 4, 28, 12, 0, 0);
    expect(daysUntilNextBirthday("1990-06-01", today)).toBe(4);
  });

  it("works with Date DOB same as YYYY-MM-DD string", () => {
    const today = new Date(2026, 4, 7, 10, 0, 0);
    const dob = new Date(Date.UTC(1990, 4, 8));
    expect(daysUntilNextBirthday(dob, today)).toBe(1);
  });
});

describe("isBirthdayToday / isUpcomingBirthdaySoon", () => {
  it("classifies today vs soon", () => {
    const today = new Date(2026, 4, 7, 20, 0, 0);
    expect(isBirthdayToday("2000-05-07", today)).toBe(true);
    expect(isUpcomingBirthdaySoon("2000-05-07", today)).toBe(false);
    expect(isUpcomingBirthdaySoon("2000-05-10", today)).toBe(true);
  });
});
