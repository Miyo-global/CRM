/**
 * Status of a dated period (a sprint or a cycle), derived from its dates.
 *
 * A sprint stored as COMPLETED showed "Completed" although it ends in two
 * weeks and holds no tickets, and a cycle whose start date had passed still
 * read "Upcoming" (QA-0074, QA-0075). A stored completion or cancellation is
 * respected; anything else follows the calendar.
 */
export type PeriodStatus = "upcoming" | "active" | "ended" | "completed" | "cancelled";

const COMPLETED = new Set(["COMPLETED", "COMPLETE", "DONE", "CLOSED"]);
const CANCELLED = new Set(["CANCELLED", "CANCELED", "ABANDONED"]);

export function periodStatus(input: {
  storedStatus?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  today?: string;
}): PeriodStatus {
  const stored = (input.storedStatus ?? "").toUpperCase();
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const start = ymd(input.startDate);
  const end = ymd(input.endDate);

  if (CANCELLED.has(stored)) return "cancelled";

  // A period cannot be complete before it has ended, whatever the row says.
  if (COMPLETED.has(stored)) {
    if (end && end >= today) return start && start > today ? "upcoming" : "active";
    return "completed";
  }

  if (start && start > today) return "upcoming";
  if (end && end < today) return "ended";
  if (start || end) return "active";
  return "upcoming";
}

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  ended: "Ended",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Completing a period only makes sense while it is running or has ended. */
export function canCompletePeriod(status: PeriodStatus): boolean {
  return status === "active" || status === "ended";
}

function ymd(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
