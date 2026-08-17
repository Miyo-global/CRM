/**
 * Locale, currency and timezone defaults.
 *
 * Organisations carry their own `currency` and `timezone` columns. These are
 * the fallbacks used wherever no org context is available — emails, generated
 * PDFs, cron jobs — and the values new organisations start from.
 *
 * They default to the Indian settings the app was built with, so behaviour is
 * unchanged until the env vars are set.
 */

export const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-IN";

export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR";

export const DEFAULT_TIMEZONE =
  process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata";

/**
 * Currency symbol for the configured currency, derived rather than hardcoded
 * so changing DEFAULT_CURRENCY does not leave ₹ signs behind. Falls back to
 * the currency code if the runtime cannot resolve a symbol.
 */
export const CURRENCY_SYMBOL: string = (() => {
  try {
    const parts = new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
})();

/**
 * Whether to use the Indian numbering system (Lakh / Crore) for compact
 * amounts. Other locales get the K / M / B scale instead.
 */
export const USES_INDIAN_NUMBERING = /-IN$/.test(DEFAULT_LOCALE);

/** ISO date (YYYY-MM-DD) for a moment, in the configured timezone. */
export function isoDateInTimezone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}
