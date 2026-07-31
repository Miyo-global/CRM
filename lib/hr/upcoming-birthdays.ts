import { differenceInCalendarDays, format, startOfDay } from "date-fns";

export function normalizeDobToYmd(dateOfBirth: string | Date | null | undefined): string | null {
  if (dateOfBirth == null || dateOfBirth === "") return null;
  if (typeof dateOfBirth === "string") {
    const head = dateOfBirth.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
    const d = new Date(dateOfBirth);
    if (Number.isNaN(d.getTime())) return null;
    return ymdFromDateUTC(d);
  }
  if (dateOfBirth instanceof Date) {
    if (Number.isNaN(dateOfBirth.getTime())) return null;
    return ymdFromDateUTC(dateOfBirth);
  }
  return null;
}

function ymdFromDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDobMonthDay(
  dateOfBirth: string | Date | null | undefined,
): { month: number; day: number } | null {
  const ymd = normalizeDobToYmd(dateOfBirth);
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (m) {
    return { month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
  }
  return null;
}

export function formatBirthdayMonthDayLabel(ymd: string): string | null {
  const parsed = parseDobMonthDay(ymd);
  if (!parsed) return null;
  const { month, day } = parsed;
  return format(new Date(2024, month, day), "MMM d");
}

export function daysUntilNextBirthday(
  dateOfBirth: string | Date | null | undefined,
  today: Date = new Date(),
): number | null {
  const parsed = parseDobMonthDay(dateOfBirth);
  if (!parsed) return null;
  const { month, day } = parsed;
  const t0 = startOfDay(today);
  const y = t0.getFullYear();
  let next = startOfDay(new Date(y, month, day));
  if (next < t0) {
    next = startOfDay(new Date(y + 1, month, day));
  }
  return differenceInCalendarDays(next, t0);
}

export function isBirthdayToday(
  dateOfBirth: string | Date | null | undefined,
  today: Date = new Date(),
): boolean {
  const d = daysUntilNextBirthday(dateOfBirth, today);
  return d === 0;
}

export function isUpcomingBirthdaySoon(
  dateOfBirth: string | Date | null | undefined,
  today: Date = new Date(),
): boolean {
  const d = daysUntilNextBirthday(dateOfBirth, today);
  return d !== null && d >= 1 && d <= 7;
}
