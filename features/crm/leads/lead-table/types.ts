import { formatDisplayDate } from "@/lib/date-utils";
import { toneSoft } from "@/lib/design/tones";
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

// Pills: soft fill, no border. Mirrors leads-constants.ts / detail/lead-types.ts
// so every lead view reads identically (pipeline: info → teal → plum → brand →
// success, LOST danger; source tags follow TAG_TONE_CYCLE).
const PILL = "border-transparent";

export const STATUS_COLORS: Record<string, string> = {
  NEW: `${toneSoft.info} ${PILL}`,
  CONTACTED: `${toneSoft.teal} ${PILL}`,
  INTERESTED: `${toneSoft.plum} ${PILL}`,
  QUALIFIED: `${toneSoft.brand} ${PILL}`,
  CONVERTED: `${toneSoft.success} ${PILL}`,
  LOST: `${toneSoft.danger} ${PILL}`,
};

export const PRIORITY_COLORS: Record<string, string> = {
  HOT: `${toneSoft.danger} ${PILL}`,
  WARM: `${toneSoft.warning} ${PILL}`,
  COLD: `${toneSoft.info} ${PILL}`,
};

export const SOURCE_COLORS: Record<string, string> = {
  referral: toneSoft.info,
  campaign: toneSoft.teal,
  cold_call: toneSoft.plum,
  website: toneSoft.brand,
  social_media: toneSoft.warning,
  walk_in: toneSoft.success,
  other: toneSoft.neutral,
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
