/**
 * Shifts and rosters (INFO-shifts-rosters-not-in-build). Pure helpers shared by
 * the API and the pages. Dates are "YYYY-MM-DD" strings, so they compare as text.
 */

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface AssignmentRange {
  id: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** "HH:MM" from Postgres "HH:MM:SS". */
export function formatShiftTime(t: string): string {
  return t.slice(0, 5);
}

/** "09:00–18:00", or "22:00–06:00 (overnight)" when the shift crosses midnight. */
export function formatShiftWindow(start: string, end: string): string {
  const s = formatShiftTime(start);
  const e = formatShiftTime(end);
  return `${s}–${e}${e < s ? " (overnight)" : ""}`;
}

/** "Mon–Fri", "Sat, Sun", "Every day" — consecutive runs collapse to a range. */
export function formatShiftDays(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 0) return "No days";
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(
      j - i >= 2
        ? `${WEEKDAY_LABELS[sorted[i]]}–${WEEKDAY_LABELS[sorted[j]]}`
        : sorted.slice(i, j + 1).map((d) => WEEKDAY_LABELS[d]).join(", "),
    );
    i = j + 1;
  }
  return parts.join(", ");
}

/** The assignment in force on `day`: the latest start on or before it that has not ended. */
export function currentAssignment<T extends AssignmentRange>(rows: readonly T[], day: string): T | null {
  let best: T | null = null;
  for (const r of rows) {
    if (r.effectiveFrom > day) continue;
    if (r.effectiveTo !== null && r.effectiveTo < day) continue;
    if (!best || r.effectiveFrom > best.effectiveFrom) best = r;
  }
  return best;
}

function dayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Placing a new assignment [from, to] among an employee's existing ones.
 * An open-ended assignment that started earlier is closed the day before
 * `from` (moving someone to a new shift). Any other overlap is a conflict:
 * HR removes or shortens that row first.
 */
export function planAssignment(
  existing: readonly AssignmentRange[],
  from: string,
  to: string | null,
): { ok: true; close: { id: number; effectiveTo: string }[] } | { ok: false; conflictId: number } {
  const close: { id: number; effectiveTo: string }[] = [];
  for (const r of existing) {
    const overlaps = (to === null || r.effectiveFrom <= to) && (r.effectiveTo === null || r.effectiveTo >= from);
    if (!overlaps) continue;
    if (r.effectiveTo === null && r.effectiveFrom < from) {
      close.push({ id: r.id, effectiveTo: dayBefore(from) });
      continue;
    }
    return { ok: false, conflictId: r.id };
  }
  return { ok: true, close };
}
