import {
  Bug,
  BookOpen,
  CheckCircle2,
  Activity,
} from "lucide-react";

export type TicketType = "BUG" | "STORY" | "TASK" | "EPIC";

const VALID_TICKET_TYPES = new Set<string>(["BUG", "STORY", "TASK", "EPIC"]);

export function isTicketType(value: unknown): value is TicketType {
  return typeof value === "string" && VALID_TICKET_TYPES.has(value);
}

export const typeIcons: Record<TicketType, React.ComponentType<{ className?: string }>> = {
  BUG: Bug,
  STORY: BookOpen,
  TASK: CheckCircle2,
  EPIC: Activity,
};

export const DEFAULT_TICKET_ICON = CheckCircle2;

/** Ticket type → tone (§6.2: Bug danger, Story success, Task info, Epic plum). */
export const typeTones: Record<TicketType, import("@/lib/design/tones").Tone> = {
  BUG: "danger",
  STORY: "success",
  TASK: "info",
  EPIC: "plum",
};
