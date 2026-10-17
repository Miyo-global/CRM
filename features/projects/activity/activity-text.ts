import type { ActivityItem } from "@/lib/api/hooks/projects/activity";

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  status: "status",
  priority: "priority",
  type: "type",
  assigneeId: "assignee",
  dueDate: "due date",
  points: "estimate",
  sprintId: "sprint",
  cycleId: "cycle",
};

const PLAIN: Record<string, string> = {
  created: "created the ticket",
  comment_added: "commented",
  comment_updated: "edited a comment",
  comment_deleted: "deleted a comment",
  archived: "archived the ticket",
  restored: "restored the ticket",
  label_changed: "changed labels",
  relation_added: "linked a ticket",
  relation_removed: "removed a link",
  parent_set: "set a parent ticket",
  parent_removed: "removed the parent ticket",
};

/** Enum values a plain lower-casing would read badly as. */
const VALUE_LABELS: Record<string, string> = {
  TODO: "to do",
  QA: "QA",
};

function pretty(value: string | null) {
  if (!value) return "none";
  if (VALUE_LABELS[value]) return VALUE_LABELS[value];
  // SCREAMING_SNAKE is an enum coming straight off the column; anything else
  // is text a person typed, so leave it alone.
  return /^[A-Z][A-Z0-9_]*$/.test(value) ? value.replace(/_/g, " ").toLowerCase() : value;
}

export function actorName(actor: ActivityItem["actor"]): string {
  if (!actor) return "Someone";
  return actor.name?.trim() || [actor.firstName, actor.lastName].filter(Boolean).join(" ") || "Someone";
}

export function describeActivity(item: Pick<ActivityItem, "action" | "field" | "fromValue" | "toValue">): string {
  if (PLAIN[item.action]) return PLAIN[item.action];
  const field = FIELD_LABELS[item.field ?? ""] ?? "a field";
  if (!item.fromValue) return `set ${field} to ${pretty(item.toValue)}`;
  if (!item.toValue) return `cleared ${field}`;
  return `changed ${field} from ${pretty(item.fromValue)} to ${pretty(item.toValue)}`;
}
