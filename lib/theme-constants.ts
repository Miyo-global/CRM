import { toneBar, toneDot, toneSoft, toneText } from "@/lib/design/tones";

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type ProjectStatus = "ACTIVE" | "PLANNING" | "COMPLETED" | "ON_HOLD";
export type DealStage = "Negotiation" | "Proposal" | "Closed Won" | "Qualified" | "Discovery";
export type EventStatus = "confirmed" | "planning";
export type OnlineStatus = "online" | "away" | "offline";
export type CampaignStatus = "active" | "paused" | "completed";

const VALID_CAMPAIGN_STATUSES: ReadonlySet<string> = new Set(["active", "paused", "completed"]);

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === "string" && VALID_CAMPAIGN_STATUSES.has(value);
}

const FALLBACK_COLOR = toneSoft.neutral;

export const priorityColors: Record<Priority, string> = {
  URGENT: toneSoft.danger,
  HIGH: toneSoft.warning,
  MEDIUM: toneSoft.brand,
  LOW: toneSoft.neutral,
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  ACTIVE: toneSoft.success,
  PLANNING: toneSoft.info,
  COMPLETED: toneSoft.neutral,
  ON_HOLD: toneSoft.warning,
};

export const stageColors: Record<DealStage, string> = {
  Negotiation: toneSoft.brand,
  Proposal: toneSoft.plum,
  "Closed Won": toneSoft.success,
  Qualified: toneSoft.teal,
  Discovery: toneSoft.info,
};

export const eventStatusColors: Record<EventStatus, string> = {
  confirmed: toneSoft.success,
  planning: toneSoft.info,
};

export const onlineStatusColors: Record<OnlineStatus, string> = {
  online: toneDot.success,
  away: toneDot.warning,
  offline: toneDot.neutral,
};

export const campaignStatusConfig: Record<CampaignStatus, { color: string; bg: string }> = {
  active: { color: toneText.success, bg: "bg-success-soft" },
  paused: { color: toneText.warning, bg: "bg-warning-soft" },
  completed: { color: toneText.neutral, bg: "bg-neutral-soft" },
};

export const rankStyles = [
  {
    bg: "bg-brand-soft",
    text: "text-brand-soft-foreground",
    border: "border-gold-400/40",
    ring: "ring-gold-400/40",
    label: "1st",
    barColor: "bg-gold-400",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    bg: "bg-ink-100",
    text: "text-ink-700",
    border: "border-border-strong",
    ring: "ring-border-strong",
    label: "2nd",
    barColor: "bg-ink-300",
    badgeColor: "bg-ink-700 text-white",
  },
  {
    bg: "bg-warning-soft",
    text: "text-warning-strong",
    border: "border-warning-600/30",
    ring: "ring-warning-600/30",
    label: "3rd",
    barColor: "bg-warning-600",
    badgeColor: "bg-warning text-warning-foreground",
  },
];

export const sprintStatusColors = {
  done: toneBar.success,
  inProgress: toneBar.info,
  todo: toneBar.neutral,
} as const;

export const sparkColors = {
  blue: "var(--chart-3)",
  green: "var(--chart-7)",
  purple: "var(--chart-5)",
  amber: "var(--chart-1)",
} as const;

export type LeaveStatus = "APPROVED" | "REJECTED" | "PENDING";
export type PayrollStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";

export const leaveStatusColors: Record<LeaveStatus, string> = {
  APPROVED: toneSoft.success,
  REJECTED: toneSoft.danger,
  PENDING: toneSoft.warning,
};

export const payrollStatusColors: Record<PayrollStatus, string> = {
  DRAFT: toneSoft.neutral,
  PENDING_APPROVAL: toneSoft.warning,
  APPROVED: toneSoft.info,
  PAID: toneSoft.success,
};

export const expenseStatusColors: Record<ExpenseStatus, string> = {
  PENDING: toneSoft.warning,
  APPROVED: toneSoft.success,
  REJECTED: toneSoft.danger,
  PAID: toneSoft.info,
};

export const deviceStatusColors: Record<DeviceStatus, string> = {
  ACTIVE: toneSoft.success,
  INACTIVE: toneSoft.neutral,
  LOST: toneSoft.danger,
  RETURNED: toneSoft.info,
};

export type WfhStatus = "PENDING" | "APPROVED" | "REJECTED";

const VALID_WFH_STATUSES: ReadonlySet<string> = new Set(["PENDING", "APPROVED", "REJECTED"]);

export function isWfhStatus(value: unknown): value is WfhStatus {
  return typeof value === "string" && VALID_WFH_STATUSES.has(value);
}

export const wfhStatusColors: Record<WfhStatus, string> = {
  APPROVED: toneSoft.success,
  REJECTED: toneSoft.danger,
  PENDING: toneSoft.warning,
};

export type DocumentType = "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "PAYSLIP" | "POLICY" | "OFFER_LETTER" | "RESUME" | "OTHER";

const VALID_DOCUMENT_TYPES: ReadonlySet<string> = new Set([
  "CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER",
]);

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && VALID_DOCUMENT_TYPES.has(value);
}

const VALID_DEVICE_STATUSES: ReadonlySet<string> = new Set(["ACTIVE", "INACTIVE", "LOST", "RETURNED"]);

export function isDeviceStatus(value: unknown): value is DeviceStatus {
  return typeof value === "string" && VALID_DEVICE_STATUSES.has(value);
}

export const documentTypeColors: Record<string, string> = {
  CONTRACT: toneSoft.info,
  CERTIFICATE: toneSoft.plum,
  ID_PROOF: toneSoft.teal,
  PAYSLIP: toneSoft.brand,
  POLICY: toneSoft.neutral,
  OFFER_LETTER: toneSoft.success,
  RESUME: toneSoft.plum,
  OTHER: toneSoft.neutral,
};

export type HealthStatus = "healthy" | "at_risk" | "critical";

export const healthStatusColors: Record<HealthStatus, string> = {
  healthy: toneSoft.success,
  at_risk: toneSoft.warning,
  critical: toneSoft.danger,
};

export const healthDotColors: Record<HealthStatus, string> = {
  healthy: toneDot.success,
  at_risk: toneDot.warning,
  critical: toneDot.danger,
};

export type CrmRole = "sales_rep" | "csm" | "marketing";

export const roleBadgeConfig: Record<CrmRole, { label: string; color: string }> = {
  sales_rep: { label: "Sales", color: toneSoft.info },
  csm: { label: "Customer Success", color: toneSoft.success },
  marketing: { label: "Marketing", color: toneSoft.plum },
};

const VALID_PROJECT_STATUSES: ReadonlySet<string> = new Set(["ACTIVE", "PLANNING", "COMPLETED", "ON_HOLD", "ARCHIVED"]);

export function isProjectStatus(value: unknown): value is ProjectStatus | "ARCHIVED" {
  return typeof value === "string" && VALID_PROJECT_STATUSES.has(value);
}

export const projectStatusDisplayLabels: Record<string, string> = {
  ACTIVE: "IN PROGRESS",
  PLANNING: "PLANNING",
  COMPLETED: "COMPLETED",
  ON_HOLD: "ON HOLD",
  ARCHIVED: "ARCHIVED",
};

export const projectProgressBarColors: Record<string, string> = {
  ACTIVE: toneBar.success,
  PLANNING: toneBar.info,
  COMPLETED: toneBar.brand,
  ON_HOLD: toneBar.neutral,
  ARCHIVED: "bg-ink-200",
};

export function getColorSafe<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? FALLBACK_COLOR;
}
