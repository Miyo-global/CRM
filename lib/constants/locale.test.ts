import { describe, expect, it } from "vitest";
import {
  CURRENCY_SYMBOL,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  USES_INDIAN_NUMBERING,
  isoDateInTimezone,
} from "./locale";

describe("locale defaults", () => {
  it("falls back to the shipped Indian defaults when no env is set", () => {
    expect(DEFAULT_LOCALE).toBe("en-IN");
    expect(DEFAULT_CURRENCY).toBe("INR");
    expect(DEFAULT_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("derives the currency symbol rather than hardcoding it", () => {
    expect(CURRENCY_SYMBOL).toBe("₹");
  });

  it("selects Indian numbering for -IN locales", () => {
    expect(USES_INDIAN_NUMBERING).toBe(true);
  });
});

describe("isoDateInTimezone", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(isoDateInTimezone(new Date("2026-03-15T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves the date according to the given timezone", () => {
    // 18:30 UTC is already the next calendar day in IST (UTC+5:30).
    const instant = new Date("2026-03-15T19:00:00Z");
    expect(isoDateInTimezone(instant, "UTC")).toBe("2026-03-15");
    expect(isoDateInTimezone(instant, "Asia/Kolkata")).toBe("2026-03-16");
  });
});
