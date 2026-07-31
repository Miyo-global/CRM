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
  URGENT: { label: "Urgent", color: "text-red-500", icon: "AlertTriangle" },
  HIGH: { label: "High", color: "text-orange-500", icon: "ArrowUp" },
  MEDIUM: { label: "Medium", color: "text-yellow-500", icon: "Minus" },
  LOW: { label: "Low", color: "text-blue-500", icon: "ArrowDown" },
};

export const statusConfig: Record<
  string,
  { label: string; dotColor: string }
> = {
  TODO: { label: "To Do", dotColor: "bg-muted-foreground" },
  IN_PROGRESS: { label: "In Progress", dotColor: "bg-blue-500" },
  IN_REVIEW: { label: "In Review", dotColor: "bg-amber-500" },
  DONE: { label: "Done", dotColor: "bg-green-500" },
};

export const typeConfig: Record<
  string,
  { label: string; color: string }
> = {
  TASK: { label: "Task", color: "text-blue-500" },
  BUG: { label: "Bug", color: "text-red-500" },
  STORY: { label: "Story", color: "text-green-500" },
  EPIC: { label: "Epic", color: "text-purple-500" },
  SUBTASK: { label: "Subtask", color: "text-muted-foreground" },
};

export type SwimlaneBy = "none" | "assignee" | "priority" | "epic";
