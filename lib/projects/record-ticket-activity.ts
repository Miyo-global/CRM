import { db } from "@/lib/db";
import { ticketActivity } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export type TicketActivityAction =
  | "created"
  | "title_changed"
  | "status_changed"
  | "priority_changed"
  | "type_changed"
  | "assignee_changed"
  | "due_date_changed"
  | "estimate_changed"
  | "sprint_changed"
  | "cycle_changed"
  | "parent_set"
  | "parent_removed"
  | "label_changed"
  | "relation_added"
  | "relation_removed"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "archived"
  | "restored";

const TRACKED_FIELDS = {
  title: "title_changed",
  status: "status_changed",
  priority: "priority_changed",
  type: "type_changed",
  assigneeId: "assignee_changed",
  dueDate: "due_date_changed",
  points: "estimate_changed",
  sprintId: "sprint_changed",
  cycleId: "cycle_changed",
} as const satisfies Record<string, TicketActivityAction>;

type TrackedField = keyof typeof TRACKED_FIELDS | "parentTicketId";
type TicketSnapshot = Partial<Record<TrackedField, unknown>>;
type Labeler = (field: TrackedField, value: string) => string | undefined;

const MAX_VALUE_LENGTH = 200;

function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = (value instanceof Date ? value.toISOString().slice(0, 10) : String(value)).trim();
  return text === "" ? null : text;
}

function display(field: TrackedField, value: string | null, label?: Labeler): string | null {
  if (value === null) return null;
  const shown = label?.(field, value) ?? value;
  return shown.length > MAX_VALUE_LENGTH ? `${shown.slice(0, MAX_VALUE_LENGTH - 1)}…` : shown;
}

export type TicketActivityEntry = {
  action: TicketActivityAction;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
};

export function diffTicketActivity(
  before: TicketSnapshot,
  after: TicketSnapshot,
  label?: Labeler,
): TicketActivityEntry[] {
  const entries: TicketActivityEntry[] = [];

  for (const [field, action] of Object.entries(TRACKED_FIELDS) as [keyof typeof TRACKED_FIELDS, TicketActivityAction][]) {
    if (!(field in after)) continue;
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (from === to) continue;
    entries.push({ action, field, fromValue: display(field, from, label), toValue: display(field, to, label) });
  }

  if ("parentTicketId" in after) {
    const from = normalize(before.parentTicketId);
    const to = normalize(after.parentTicketId);
    if (from !== to) {
      entries.push({
        action: to === null ? "parent_removed" : "parent_set",
        field: "parentTicketId",
        fromValue: display("parentTicketId", from, label),
        toValue: display("parentTicketId", to, label),
      });
    }
  }

  return entries;
}

type ActivityContext = { orgId: string; projectId: number; ticketId: number; actorId: string | null };

export async function recordTicketActivity(ctx: ActivityContext, entries: TicketActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    await db.insert(ticketActivity).values(entries.map((entry) => ({ ...ctx, ...entry })));
  } catch (error) {
    logger.error("Failed to record ticket activity", { error, ticketId: ctx.ticketId });
  }
}
