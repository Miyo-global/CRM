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

/**
 * First day of a "YYYY-MM" month key as a local date. `new Date("2026-10-01")`
 * is UTC midnight, which is still 30 September in any timezone west of UTC, so
 * the payroll picker said October while the title said September (R2-PAY-01).
 */
export function monthKeyToDate(month: string): Date {
  return fromISODateString(`${month.slice(0, 7)}-01`);
}

/**
 * A calendar date as a local Date: "YYYY-MM-DD" is read as that local day
 * (not UTC midnight, which is the day before west of UTC); anything else is
 * parsed as usual.
 */
export function parseCalendarDate(value: Date | string): Date {
  if (typeof value !== "string") return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromISODateString(value) : new Date(value);
}

export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Parse a stored timestamp. DB columns are `timestamp without time zone`
 * holding UTC, so a string with no offset ("2026-10-15 03:20:00") is UTC,
 * not the viewer's local time (MIYO-0069 / MIYO-0073). Date-only strings
 * and strings that already carry Z or an offset parse as usual.
 */
export function parseDbTimestamp(value: Date | string): Date {
  if (typeof value !== "string") return value;
  const naive = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value.trim());
  return new Date(naive ? `${value.trim().replace(" ", "T")}Z` : value);
}

export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Today as "YYYY-MM-DD" in the organisation timezone, on client and server
 * alike. Never the browser's or the server's local day (R3-TZ-01).
 */
export function getTodayString(timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** True for a bare calendar date string "YYYY-MM-DD" that names a real day. */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

function dateOnlyToUtc(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10); // UTC midnight, so the slice is the calendar day.
}

/**
 * The UTC instant at which calendar day `value` ("YYYY-MM-DD") starts in
 * `timeZone` (IST by default): 2026-10-24 in IST starts 2026-10-23T18:30Z.
 * Server-side day filters use this instead of the server's own midnight.
 */
export function zonedDayStartUtc(value: string, timeZone: string = DEFAULT_TIMEZONE): Date {
  const guess = dateOnlyToUtc(value).getTime();
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]),
    );
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
  };
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first)); // second pass settles a DST change between the two
}

/** "YYYY-MM-DD" plus `days` (may be negative); pure calendar arithmetic, no timezone. */
export function addDaysToDateString(value: string, days: number): string {
  const d = dateOnlyToUtc(value);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToDateOnly(d);
}

/**
 * "YYYY-MM-DD" minus `years`, e.g. the latest date of birth for someone who is
 * 18 today. 29 Feb falls back to 28 Feb in non-leap years (R3-ONB-06).
 */
export function subtractYearsFromDateString(value: string, years: number): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const lastDay = new Date(Date.UTC(y - years, m, 0)).getUTCDate();
  return utcToDateOnly(new Date(Date.UTC(y - years, m - 1, Math.min(d, lastDay))));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). DST-proof. */
export function daysBetweenDateStrings(from: string, to: string): number {
  return Math.round((dateOnlyToUtc(to).getTime() - dateOnlyToUtc(from).getTime()) / 86_400_000);
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
  // A bare calendar date never shifts, whatever the org or browser timezone.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return formatCalendarDate(date, options, locale);
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, {
    timeZone: DEFAULT_TIMEZONE,
    ...(options ?? { day: "numeric", month: "short", year: "numeric" }),
  });
}

/**
 * Formats a bare calendar date ("YYYY-MM-DD") for display without ever
 * shifting it a day.
 *
 * `new Date("2026-10-16")` is UTC midnight, so rendering it with the browser's
 * locale showed 15 October in any timezone behind UTC (QA-0025). A calendar
 * date has no timezone, so format the parts directly.
 */
export function formatCalendarDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return formatDisplayDate(value, options, locale);
  const local = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return local.toLocaleDateString(locale, options ?? { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A span of calendar days in one consistent style: "28 Oct 2026" for a single
 * day, "28 Oct – 29 Oct 2026" within a year, full dates across years.
 */
export function formatCalendarRange(
  start: string | Date,
  end?: string | Date | null,
  locale: string = DEFAULT_LOCALE,
): string {
  // A Date here is a local calendar day (as parseCalendarDate returns).
  const key = (v: string | Date) => (typeof v === "string" ? v.slice(0, 10) : toDatetimeLocalValue(v).slice(0, 10));
  const s = key(start);
  const e = key(end ?? start);
  const full = (v: string) => formatCalendarDate(v, undefined, locale);
  if (e === s) return full(s);
  if (s.slice(0, 4) !== e.slice(0, 4)) return `${full(s)} – ${full(e)}`;
  return `${formatCalendarDate(s, { day: "numeric", month: "short" }, locale)} – ${full(e)}`;
}

export function formatDisplayDateTime(
  date: Date | string | null | undefined,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!date) return "";
  const d = parseDbTimestamp(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(locale, {
    timeZone: DEFAULT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Date and time in the organisation timezone (IST by default), whatever the
 * viewer's browser is set to. Timestamps are stored in UTC; every display of
 * one goes through here (A38).
 */
export function formatIST(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "";
  const d = parseDbTimestamp(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/** Clock time only, in the organisation timezone. */
export function formatISTTime(date: Date | string | null | undefined): string {
  return formatIST(date, { day: undefined, month: undefined, year: undefined });
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = parseDbTimestamp(date);
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
