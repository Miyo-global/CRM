import type { ProjectPriority, ProjectStatusValue } from "@/types/projects";

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatusValue; label: string }[] = [
  { value: "ACTIVE", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export const PROJECT_PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export const PROJECT_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "key", label: "Key" },
  { value: "startDate", label: "Start date" },
  { value: "endDate", label: "Due date" },
] as const;

export type ProjectGroupBy = "none" | "status" | "priority";

export function priorityLabel(value: ProjectPriority | null | undefined): string {
  return PROJECT_PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? "No priority";
}

export function statusLabel(value: ProjectStatusValue | null | undefined): string {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "In progress";
}
