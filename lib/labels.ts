/**
 * R3-LBL-01: the one place enum values become words. Every list, badge,
 * timeline and audit row renders through these maps, so a raw value
 * (PENDING_HR, CEO_APPROVED, TODO) never reaches the screen. Each map is an
 * exhaustive Record, so a new enum value fails the typecheck until it has a
 * label. The stored values (and the CEO role slug) do not change; "CEO" is
 * shown as "Super Admin".
 */
import { TERMINATION_STATUS_LABELS } from "@/lib/constants/hr-separation";
import { ROLE_LABELS, getRoleLabel } from "@/lib/rbac/roles";

export { TERMINATION_STATUS_LABELS, ROLE_LABELS, getRoleLabel };

/** Mirrors resignation_status in lib/db/schema/enums.ts (checked by labels.test.ts). */
export const RESIGNATION_STATUSES = [
  "SUBMITTED",
  "PENDING_HR",
  "HR_APPROVED",
  "CEO_APPROVED",
  "IN_PROGRESS",
  "APPROVED",
  "WITHDRAWN",
  "COMPLETED",
  "REJECTED",
] as const;
export type ResignationStatusValue = (typeof RESIGNATION_STATUSES)[number];

// CEO_APPROVED is the final sign-off, which the Super Admin or an Admin gives
// (EXIT_FINAL_APPROVER_ROLES), so the label names the step, not the person.
export const RESIGNATION_STATUS_LABELS: Record<ResignationStatusValue, string> = {
  SUBMITTED: "Submitted",
  PENDING_HR: "Pending HR review",
  HR_APPROVED: "Approved by HR",
  CEO_APPROVED: "Final sign-off given",
  IN_PROGRESS: "Exit in progress",
  APPROVED: "Approved",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

/** Mirrors ticket_status (project tickets and the HR helpdesk). */
export const TICKET_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CLOSED", "CANCELLED"] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatusValue, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/**
 * Permission groups (the `resource` of a permission). The roles list, the
 * role editor and the permissions matrix all used their own formatting
 * ("HR - Assets", "HR › ASSETS", "ATS:CANDIDATES"); this is the one spelling.
 */
export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  "hr:employees": "HR › Employees",
  "hr:attendance": "HR › Attendance",
  "hr:leaves": "HR › Leaves",
  "hr:payroll": "HR › Payroll",
  "hr:salary": "HR › Salary",
  "hr:expenses": "HR › Expenses",
  "hr:assets": "HR › Assets",
  "hr:documents": "HR › Documents",
  "hr:performance": "HR › Performance",
  "hr:goals": "HR › Goals",
  "hr:termination": "HR › Termination",
  projects: "Projects",
  "projects:tickets": "Projects › Tickets",
  "projects:sprints": "Projects › Sprints",
  "projects:timesheets": "Projects › Timesheets",
  reports: "Reports",
  settings: "Settings",
  "settings:rbac": "Settings › Roles & permissions",
  roles: "Roles",
  "dashboard:support": "Dashboard › Support",
  self: "Self-service",
  branch: "Branches",
  "kb:articles": "Knowledge › Articles",
  "kb:categories": "Knowledge › Categories",
  "kb:spaces": "Knowledge › Spaces",
  "kb:analytics": "Knowledge › Analytics",
  "kb:ai": "Knowledge › AI answers",
  "kb:pages": "Knowledge › Pages",
  "kb:templates": "Knowledge › Templates",
  "kb:reviews": "Knowledge › Reviews",
  "kb:settings": "Knowledge › Settings",
  // Only listed while NEXT_PUBLIC_ATS_MODULE=on (R3-INV-01).
  "ats:jobs": "Hiring › Jobs",
  "ats:requisitions": "Hiring › Requisitions",
  "ats:candidates": "Hiring › Candidates",
  "ats:interviews": "Hiring › Interviews",
  "ats:offers": "Hiring › Offers",
  "ats:settings": "Hiring › Settings",
};

function sentenceCase(text: string): string {
  const t = text.replace(/[_-]+/g, " ").trim().toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : text;
}

export function permissionGroupLabel(resource: string): string {
  return PERMISSION_GROUP_LABELS[resource] ?? resource.split(":").map(sentenceCase).join(" › ");
}

/** Permission action ("manage_targets" -> "Manage targets"). */
export function permissionActionLabel(action: string): string {
  return sentenceCase(action);
}

/**
 * Audit-log target type ("termination_reason" -> "Termination reason"). Only
 * the type is reworded: the target ID is an identifier and is shown as stored,
 * never title-cased (R3-ADM-13).
 */
export function auditTargetTypeLabel(targetType: string): string {
  return sentenceCase(targetType);
}

function lookup<T extends string>(map: Record<T, string>, value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return (map as Record<string, string>)[value] ?? sentenceCase(value);
}

export const resignationStatusLabel = (s: string | null | undefined) => lookup(RESIGNATION_STATUS_LABELS, s, "Unknown");
export const ticketStatusLabel = (s: string | null | undefined) => lookup(TICKET_STATUS_LABELS, s, TICKET_STATUS_LABELS.TODO);
