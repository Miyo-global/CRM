import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

/** Today in IST as YYYY-MM-DD. */
export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
}

/** A date-only value (YYYY-MM-DD) from anything date-ish, or null. */
export function normalizeDeadlineDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10) || null;
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}
