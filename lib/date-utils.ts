import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";


/**
 * Value for `<input type="datetime-local">` in the user's local timezone.
 */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when a datetime-local string is strictly before now. */
export function isPastDatetimeLocal(value: string): boolean {
  const d = parseDatetimeLocalValue(value);
  return d ? d.getTime() < Date.now() : false;
}

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // fallback
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateOnlyUTC(date: Date | string | null | undefined): string {
  if (!date) return "";

  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const toISODateString = formatDateOnly;

export function fromISODateString(str: string): Date {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getTodayString(): string {
  return formatDateOnly(new Date());
}

export function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = formatDateOnly(date1);
  const d2 = formatDateOnly(date2);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

export function formatDisplayDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, options ?? { day: "numeric", month: "short", year: "numeric" });
}

export function formatDisplayDateTime(
  date: Date | string | null | undefined,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 0) {
    const abs = Math.abs(diff);
    if (abs < 3600) return `in ${Math.max(1, Math.floor(abs / 60))}m`;
    if (abs < 86400) return `in ${Math.floor(abs / 3600)}h`;
    return `in ${Math.floor(abs / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return formatDisplayDate(d, { day: "numeric", month: "short", year: "numeric" });
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function isToday(date: Date | string): boolean {
  const d = toDate(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isFuture(date: Date | string): boolean {
  return toDate(date).getTime() > Date.now();
}

export function isPast(date: Date | string): boolean {
  return toDate(date).getTime() < Date.now();
}

export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function daysSince(date: Date | string): number {
  return daysBetween(date, new Date());
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(toDate(date));
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Formats a date as a short month + year label for chart axes.
 * e.g. formatMonthLabel(new Date('2025-03-01')) → "Mar 2025"
 * Replaces 5 copies of `date.toLocaleString('en-US', { month: 'short', year: 'numeric' })` in route files.
 */
export function formatMonthLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(DEFAULT_LOCALE, { month: "short", year: "numeric" });
}

/**
 * Formats a date as YYYY-MM for payroll month keys.
 * e.g. formatYearMonth(new Date('2025-03-15')) → "2025-03"
 */
export function formatYearMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}
