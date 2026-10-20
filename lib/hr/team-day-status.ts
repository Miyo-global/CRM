export type TeamDayStatus = "present" | "absent" | "leave";

/**
 * Today's status for each active employee, once per person (QA-BUG-09).
 * The dashboard widgets used to join attendance and leave rows onto the
 * member list, so a second attendance row or leave row repeated a person
 * and the two widgets' totals disagreed; one counted auto-absent rows as
 * present. Approved leave wins, then a check-in, else absent.
 */
export function teamDayStatuses<M extends { userId: string }>(
  members: M[],
  checkedInIds: ReadonlySet<string>,
  onLeaveIds: ReadonlySet<string>,
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
        : "absent";
    out.push({ ...m, status });
  }
  return out;
}
