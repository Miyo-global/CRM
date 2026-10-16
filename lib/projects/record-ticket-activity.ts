import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cycles, sprints, ticketActivity, users } from "@/lib/db/schema";
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

const MAX_VALUE_LENGTH = 200;

function normalize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = (value instanceof Date ? value.toISOString().slice(0, 10) : String(value)).trim();
  return text === "" ? null : text;
}

function clip(value: string | null): string | null {
  if (value === null) return null;
  return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH - 1)}…` : value;
}

export type TicketActivityEntry = {
  action: TicketActivityAction;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
};

export function diffTicketActivity(before: TicketSnapshot, after: TicketSnapshot): TicketActivityEntry[] {
  const entries: TicketActivityEntry[] = [];

  for (const [field, action] of Object.entries(TRACKED_FIELDS) as [keyof typeof TRACKED_FIELDS, TicketActivityAction][]) {
    if (!(field in after)) continue;
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (from === to) continue;
    entries.push({ action, field, fromValue: clip(from), toValue: clip(to) });
  }

  if ("parentTicketId" in after) {
    const from = normalize(before.parentTicketId);
    const to = normalize(after.parentTicketId);
    if (from !== to) {
      entries.push({
        action: to === null ? "parent_removed" : "parent_set",
        field: "parentTicketId",
        fromValue: from,
        toValue: to,
      });
    }
  }

  return entries;
}

type ActivityContext = { orgId: string; projectId: number; ticketId: number; actorId: string | null };

function idsFor(entries: TicketActivityEntry[], field: string): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.field !== field) continue;
    if (entry.fromValue) ids.add(entry.fromValue);
    if (entry.toValue) ids.add(entry.toValue);
  }
  return [...ids];
}

function numericIds(ids: string[]): number[] {
  return ids.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0);
}

async function loadDisplayNames(orgId: string, entries: TicketActivityEntry[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const userIds = idsFor(entries, "assigneeId");
  const sprintIds = numericIds(idsFor(entries, "sprintId"));
  const cycleIds = numericIds(idsFor(entries, "cycleId"));

  if (userIds.length > 0) {
    const rows = await db.query.users.findMany({
      where: inArray(users.id, userIds),
      columns: { id: true, name: true, firstName: true, lastName: true, email: true },
    });
    for (const u of rows) {
      const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
      names.set(`assigneeId:${u.id}`, u.name?.trim() || full || u.email);
    }
  }
  if (sprintIds.length > 0) {
    const rows = await db.query.sprints.findMany({
      where: and(inArray(sprints.id, sprintIds), eq(sprints.orgId, orgId)),
      columns: { id: true, name: true },
    });
    for (const r of rows) names.set(`sprintId:${r.id}`, r.name);
  }
  if (cycleIds.length > 0) {
    const rows = await db.query.cycles.findMany({
      where: and(inArray(cycles.id, cycleIds), eq(cycles.orgId, orgId)),
      columns: { id: true, name: true },
    });
    for (const r of rows) names.set(`cycleId:${r.id}`, r.name);
  }
  return names;
}

export async function recordTicketActivity(ctx: ActivityContext, entries: TicketActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const names = await loadDisplayNames(ctx.orgId, entries);
    const named = (field: string | null, value: string | null) =>
      value === null ? null : clip(names.get(`${field}:${value}`) ?? value);
    await db.insert(ticketActivity).values(
      entries.map((entry) => ({
        ...ctx,
        ...entry,
        fromValue: named(entry.field, entry.fromValue),
        toValue: named(entry.field, entry.toValue),
      })),
    );
  } catch (error) {
    logger.error("Failed to record ticket activity", { error, ticketId: ctx.ticketId });
  }
}
