import type { CandidateStatus, SlaCandidateStatus } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

export interface ColumnConfig {
  id: CandidateStatus;
  label: string;
  bg: string;
  border: string;
  badge: string;
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: "NEW",
    label: "New",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-300 dark:border-slate-600",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  {
    id: "SCREENING",
    label: "Screening",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  },
  {
    id: "INTERVIEW",
    label: "Interview",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-700",
    badge: "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
  },
  {
    id: "OFFER",
    label: "Offer",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
  },
  {
    id: "HIRED",
    label: "Hired",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-300 dark:border-green-700",
    badge: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200",
  },
  {
    id: "REJECTED",
    label: "Rejected",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-700",
    badge: "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200",
  },
];


export { getInitials } from "@/lib/format-utils";

export function formatDate(val: Date | string | null): string {
  if (!val) return "";
  return new Date(val).toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
