import { formatDisplayDate } from "@/lib/date-utils";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
export { timeAgo } from "@/lib/date-utils";

export interface Lead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  company?: string | null;
  designation?: string | null;
  source?: string | null;
  status: string;
  priority?: string | null;
  potentialValue?: string | null;
  investmentInterest?: string | null;
  score?: number | null;
  city?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  slaDeadline?: string | Date | null;
  followUpDate?: string | Date | null;
  createdAt?: string | Date | null;
  assignedTo?: { id?: string; name?: string | null; image?: string | null } | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  image?: string | null;
}

export interface LeadTableViewProps {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusChange: (
    leadId: number,
    newStatus: string,
    extra?: {
      conversionNotes?: string;
      investmentInterest?: string;
      estimatedAmount?: string;
      createDeal?: boolean;
      dealName?: string;
      lostReason?: string;
      lostNotes?: string;
    },
  ) => void;
  onPriorityChange: (leadId: number, newPriority: string) => void;
  onAssign: (leadId: number, userId: string) => void;
  onBulkUpdate: (
    leadIds: number[],
    update: { status?: string; priority?: string; assignedToId?: string },
  ) => void;
  onBulkDelete: (leadIds: number[]) => void;
  teamMembers: TeamMember[];
  isLoading: boolean;
  isAdmin: boolean;
}

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
export const PRIORITIES = ["HOT", "WARM", "COLD"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;

export const LOST_REASONS = [
  "Not interested",
  "Budget constraints",
  "Chose competitor",
  "No response",
  "Bad timing",
  "Invalid lead",
  "Duplicate",
  "Other",
] as const;

// Categorical pipeline hues kept; light-mode text fixed to -600 (AA on white) with
// dark:-400; CONVERTED/LOST use the semantic success/destructive tokens. Mirrors
// the kanban's leads-constants.ts so both lead views read identically.
export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  CONTACTED: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  INTERESTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  QUALIFIED: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  CONVERTED: "bg-success/10 text-success border-success/20",
  LOST: "bg-destructive/10 text-destructive border-destructive/20",
};

export const PRIORITY_COLORS: Record<string, string> = {
  HOT: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  WARM: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  COLD: "bg-blue-400/15 text-blue-700 dark:text-blue-400 border-blue-400/20",
};

export const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/10 text-green-700 dark:text-green-400",
  campaign: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  cold_call: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  website: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  social_media: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  walk_in: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  other: "bg-muted text-muted-foreground",
};

export const ALL_COLUMNS = [
  { key: "leadId",             label: "Lead ID",           defaultVisible: true,  sortable: false },
  { key: "createdAt",          label: "Date",              defaultVisible: true,  sortable: true  },
  { key: "name",               label: "Name",              defaultVisible: true,  sortable: true  },
  { key: "phone",              label: "Mobile",            defaultVisible: true,  sortable: false },
  { key: "city",               label: "City",              defaultVisible: true,  sortable: false },
  { key: "source",             label: "Source",            defaultVisible: true,  sortable: true  },
  { key: "priority",           label: "Priority",          defaultVisible: true,  sortable: true  },
  { key: "status",             label: "Status",            defaultVisible: true,  sortable: true  },
  { key: "company",            label: "Company",           defaultVisible: true,  sortable: true  },
  { key: "notes",              label: "Notes",             defaultVisible: true,  sortable: false },
  { key: "followUpDate",       label: "Follow-up",         defaultVisible: true,  sortable: true  },
  { key: "investmentInterest", label: "Interest (₹)",      defaultVisible: true,  sortable: true  },
  { key: "potentialValue",     label: "Value (₹)",         defaultVisible: true,  sortable: true  },
  { key: "assignedTo",         label: "Assigned",          defaultVisible: true,  sortable: false },
  { key: "email",              label: "Email",             defaultVisible: false, sortable: true  },
  { key: "whatsapp",           label: "WhatsApp",          defaultVisible: false, sortable: false },
  { key: "score",              label: "Score",             defaultVisible: false, sortable: true  },
  { key: "tags",               label: "Tags",              defaultVisible: false, sortable: false },
  { key: "sla",                label: "SLA",               defaultVisible: false, sortable: false },
] as const;

export const DEFAULT_VISIBLE = new Set(
  ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

export function formatLeadId(id: number): string {
  return `LD-${String(id).padStart(5, "0")}`;
}

export function formatINR(val: string | number | null | undefined): string {
  if (!val) return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "";
  if (num >= 10000000) return `${CURRENCY_SYMBOL}${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${CURRENCY_SYMBOL}${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${CURRENCY_SYMBOL}${(num / 1000).toFixed(0)}K`;
  return `${CURRENCY_SYMBOL}${num.toLocaleString(DEFAULT_LOCALE)}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  return formatDisplayDate(date, { day: "numeric", month: "short", year: "numeric" }) || "";
}

export function getStoredColumns(): Set<string> {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  const saved = localStorage.getItem("lead-table-columns");
  if (!saved) return DEFAULT_VISIBLE;
  try {
    return new Set(JSON.parse(saved));
  } catch {
    return DEFAULT_VISIBLE;
  }
}
