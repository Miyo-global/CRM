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

const FALLBACK_COLOR = "bg-slate-500/10 text-slate-600 dark:text-slate-400";

export const priorityColors: Record<Priority, string> = {
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-400",
  HIGH: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  MEDIUM: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  LOW: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export const projectStatusColors: Record<ProjectStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  PLANNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  ON_HOLD: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const stageColors: Record<DealStage, string> = {
  Negotiation: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  Proposal: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  "Closed Won": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Qualified: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  Discovery: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

export const eventStatusColors: Record<EventStatus, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  planning: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export const onlineStatusColors: Record<OnlineStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400 dark:bg-slate-600",
};

export const campaignStatusConfig: Record<CampaignStatus, { color: string; bg: string }> = {
  active: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  paused: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10" },
  completed: { color: "text-slate-700 dark:text-slate-400", bg: "bg-slate-500/10" },
};

export const rankStyles = [
  {
    bg: "bg-gold/15 dark:bg-gold/20",
    text: "text-gold",
    border: "border-gold/30",
    ring: "ring-gold/20",
    label: "1st",
    barColor: "bg-gold",
    badgeColor: "bg-gold text-white",
  },
  {
    bg: "bg-slate-400/15 dark:bg-slate-400/20",
    text: "text-slate-500 dark:text-slate-300",
    border: "border-slate-400/30",
    ring: "ring-slate-400/20",
    label: "2nd",
    barColor: "bg-slate-400",
    badgeColor: "bg-slate-400 text-white",
  },
  {
    bg: "bg-amber-700/15 dark:bg-amber-700/20",
    text: "text-amber-700 dark:text-amber-600",
    border: "border-amber-700/30",
    ring: "ring-amber-700/20",
    label: "3rd",
    barColor: "bg-amber-700",
    badgeColor: "bg-amber-700 text-white",
  },
];

export const sprintStatusColors = {
  done: "bg-emerald-500",
  inProgress: "bg-blue-500",
  todo: "bg-slate-400",
} as const;

export const sparkColors = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  amber: "#F59E0B",
} as const;

export type LeaveStatus = "APPROVED" | "REJECTED" | "PENDING";
export type PayrollStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PAID";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";

export const leaveStatusColors: Record<LeaveStatus, string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
};

export const payrollStatusColors: Record<PayrollStatus, string> = {
  DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PAID: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

export const expenseStatusColors: Record<ExpenseStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-800",
  REJECTED: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-800",
  PAID: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-800",
};

export const deviceStatusColors: Record<DeviceStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  INACTIVE: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  LOST: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  RETURNED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

export type WfhStatus = "PENDING" | "APPROVED" | "REJECTED";

const VALID_WFH_STATUSES: ReadonlySet<string> = new Set(["PENDING", "APPROVED", "REJECTED"]);

export function isWfhStatus(value: unknown): value is WfhStatus {
  return typeof value === "string" && VALID_WFH_STATUSES.has(value);
}

export const wfhStatusColors: Record<WfhStatus, string> = {
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
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
  CONTRACT: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-800",
  CERTIFICATE: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-800",
  ID_PROOF: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-800",
  PAYSLIP: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-800",
  POLICY: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-800",
  OFFER_LETTER: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-800",
  RESUME: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-800",
  OTHER: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-800",
};

export type HealthStatus = "healthy" | "at_risk" | "critical";

export const healthStatusColors: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  at_risk: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export const healthDotColors: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  at_risk: "bg-amber-500",
  critical: "bg-red-500",
};

export type CrmRole = "sales_rep" | "csm" | "marketing";

export const roleBadgeConfig: Record<CrmRole, { label: string; color: string }> = {
  sales_rep: { label: "Sales", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  csm: { label: "Customer Success", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  marketing: { label: "Marketing", color: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
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
  ACTIVE: "bg-emerald-500",
  PLANNING: "bg-blue-400",
  COMPLETED: "bg-gold",
  ON_HOLD: "bg-slate-400",
  ARCHIVED: "bg-slate-300",
};

export function getColorSafe<K extends string>(map: Record<K, string>, key: string): string {
  return (map as Record<string, string>)[key] ?? FALLBACK_COLOR;
}
