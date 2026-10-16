export type HealthStatus = "on_track" | "at_risk" | "off_track";

const DONE = new Set(["DONE", "CLOSED", "CANCELLED", "COMPLETED", "RESOLVED"]);
const NOT_STARTED = new Set(["TODO", "BACKLOG", "OPEN", "NEW"]);

export function isDoneStatus(status: string): boolean {
  return DONE.has(status.toUpperCase());
}

export function isNotStartedStatus(status: string): boolean {
  return NOT_STARTED.has(status.toUpperCase());
}

export function computeHealth(input: {
  projectStatus: string | null;
  endDate: Date | null;
  total: number;
  done: number;
  now?: Date;
}): { status: HealthStatus; donePct: number } {
  const donePct = input.total > 0 ? Math.round((input.done / input.total) * 100) : 0;
  if (input.projectStatus === "COMPLETED" || input.projectStatus === "ARCHIVED") return { status: "on_track", donePct };
  if (input.endDate && input.endDate < (input.now ?? new Date()) && donePct < 100) return { status: "off_track", donePct };
  if (input.total === 0) return { status: "on_track", donePct };
  if (donePct >= 70) return { status: "on_track", donePct };
  if (donePct >= 30) return { status: "at_risk", donePct };
  return { status: "off_track", donePct };
}
