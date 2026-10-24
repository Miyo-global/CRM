export type TeamDayStatus = "present" | "absent" | "leave" | "off";

/**
 * Today's status for each active employee, once per person (QA-BUG-09).
 * The dashboard widgets used to join attendance and leave rows onto the
 * member list, so a second attendance row or leave row repeated a person
 * and the two widgets' totals disagreed; one counted auto-absent rows as
 * present. Approved leave wins, then a check-in, else absent. On a weekend
 * or holiday nobody is absent, just off (R3-EMP-10).
 */
export function teamDayStatuses<M extends { userId: string }>(
  members: M[],
  checkedInIds: ReadonlySet<string>,
  onLeaveIds: ReadonlySet<string>,
  workingDay = true,
): (M & { status: TeamDayStatus })[] {
  const seen = new Set<string>();
  const out: (M & { status: TeamDayStatus })[] = [];
  for (const m of members) {
    if (seen.has(m.userId)) continue;
    seen.add(m.userId);
    const status: TeamDayStatus = onLeaveIds.has(m.userId)
      ? "leave"
      : checkedInIds.has(m.userId)
        ? "present"
        : workingDay
          ? "absent"
          : "off";
    out.push({ ...m, status });
  }
  return out;
}

/** Saturday or Sunday for a "YYYY-MM-DD" calendar date. */
export function isWeekendDate(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}
