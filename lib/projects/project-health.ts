export type HealthStatus = "on_track" | "at_risk" | "off_track";

const DONE = new Set(["DONE", "CLOSED", "CANCELLED", "COMPLETED", "RESOLVED"]);
const NOT_STARTED = new Set(["TODO", "BACKLOG", "OPEN", "NEW"]);

export function isDoneStatus(status: string): boolean {
  return DONE.has(status.toUpperCase());
}

export function isNotStartedStatus(status: string): boolean {
  return NOT_STARTED.has(status.toUpperCase());
}

const RANK: Record<HealthStatus, number> = { on_track: 0, at_risk: 1, off_track: 2 };
const worse = (a: HealthStatus, b: HealthStatus) => (RANK[a] >= RANK[b] ? a : b);

/**
 * QA P3-project-health-off-track-zero-overdue: health used to be the done
 * percentage alone, so a young project with nothing overdue read "Off track".
 * Now it is the worse of two signals:
 * - schedule: done % against the share of the start→end window elapsed
 *   (behind by 30+ points is off track, 10+ at risk); only with both dates;
 * - overdue: share of open tickets past their due date (30%+ off track,
 *   any at risk).
 * A passed end date with work left is always off track.
 */
export function computeHealth(input: {
  projectStatus: string | null;
  startDate?: Date | null;
  endDate: Date | null;
  total: number;
  done: number;
  overdue?: number;
  now?: Date;
}): { status: HealthStatus; donePct: number } {
  const donePct = input.total > 0 ? Math.round((input.done / input.total) * 100) : 0;
  const now = input.now ?? new Date();
  if (input.projectStatus === "COMPLETED" || input.projectStatus === "ARCHIVED") return { status: "on_track", donePct };
  if (input.endDate && input.endDate < now && donePct < 100) return { status: "off_track", donePct };
  if (input.total === 0) return { status: "on_track", donePct };

  let schedule: HealthStatus = "on_track";
  if (input.startDate && input.endDate && input.endDate > input.startDate) {
    const span = input.endDate.getTime() - input.startDate.getTime();
    const elapsedPct = Math.min(100, Math.max(0, ((now.getTime() - input.startDate.getTime()) / span) * 100));
    const behind = elapsedPct - donePct;
    schedule = behind >= 30 ? "off_track" : behind >= 10 ? "at_risk" : "on_track";
  }

  const open = input.total - input.done;
  const overdue = input.overdue ?? 0;
  const overdueHealth: HealthStatus =
    overdue === 0 || open <= 0 ? "on_track" : overdue / open >= 0.3 ? "off_track" : "at_risk";

  return { status: worse(schedule, overdueHealth), donePct };
}
