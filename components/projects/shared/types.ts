import type { TicketPriority, TicketType } from "@/types/projects";

export interface KanbanTicket {
  id: number;
  title: string;
  type: string;
  status: string;
  priority?: TicketPriority | string | null;
  ticketNumber?: number;
  points?: number | null;
  storyPoints?: number | null;
  assigneeId?: string | null;
  epicId?: number | null;
  sprintId?: number | null;
  order?: number | null;
  rank?: string | null;
  version?: number;
  dueDate?: string | null;
  startDate?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  timeSpent?: string | null;
  assignee?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
  assignees?: {
    user?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    };
  }[];
  labels?: {
    label?: {
      id: number;
      name: string;
      color?: string | null;
    };
  }[];
  project?: { id: number; name: string; key: string } | null;
  /** Checklist progress shown on the card (MIYO-0111). */
  checklistDone?: number;
  checklistTotal?: number;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number;
}

export const priorityConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  URGENT: { label: "Urgent", color: "text-danger-strong", icon: "AlertTriangle" },
  HIGH: { label: "High", color: "text-warning-strong", icon: "ArrowUp" },
  MEDIUM: { label: "Medium", color: "text-warning-strong", icon: "Minus" },
  LOW: { label: "Low", color: "text-info-strong", icon: "ArrowDown" },
};

export const statusConfig: Record<
  string,
  { label: string; dotColor: string }
> = {
  TODO: { label: "To Do", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", dotColor: "bg-info-500" },
  IN_REVIEW: { label: "In Review", dotColor: "bg-warning-500" },
  DONE: { label: "Done", dotColor: "bg-success-500" },
};

export const typeConfig: Record<
  string,
  { label: string; color: string }
> = {
  TASK: { label: "Task", color: "text-info-strong" },
  BUG: { label: "Bug", color: "text-danger-strong" },
  STORY: { label: "Story", color: "text-success-strong" },
  EPIC: { label: "Epic", color: "text-plum-strong" },
  SUBTASK: { label: "Subtask", color: "text-muted-foreground" },
};

export type SwimlaneBy = "none" | "assignee" | "priority" | "epic";
