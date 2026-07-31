import type { CandidateStatus, JobPostingStatus } from "@/types/hr";

export const STATUSES: { value: CandidateStatus; label: string; color: string }[] = [
  { value: "NEW", label: "New", color: "bg-blue-500" },
  { value: "SCREENING", label: "Screening", color: "bg-yellow-500" },
  { value: "INTERVIEW", label: "Interview", color: "bg-purple-500" },
  { value: "OFFER", label: "Offer", color: "bg-orange-500" },
  { value: "HIRED", label: "Hired", color: "bg-green-500" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-500" },
];

export const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  JOB_PORTAL: "Job Portal",
  CAMPUS: "Campus",
  CAREERS_PAGE: "Careers Page",
  NAUKRI: "Naukri",
  INDEED: "Indeed",
};

export const SOURCE_BADGE_CLASSES: Record<string, string> = {
  LINKEDIN: "border-blue-300 text-blue-700 dark:text-blue-400",
  NAUKRI: "border-orange-300 text-orange-700 dark:text-orange-400",
  REFERRAL: "border-green-300 text-green-700 dark:text-green-400",
  CAMPUS: "border-purple-300 text-purple-700 dark:text-purple-400",
  JOB_PORTAL: "border-cyan-300 text-cyan-700 dark:text-cyan-400",
  CAREERS_PAGE: "border-primary/40 text-primary",
  DIRECT: "text-muted-foreground",
};

export const JOB_STATUS_LABELS: Record<JobPostingStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  PAUSED: "Paused",
  CLOSED: "Closed",
  FILLED: "Filled",
};

export function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "HIRED":
      return "default";
    case "INTERVIEW":
    case "OFFER":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

export function jobStatusClass(status: JobPostingStatus | null): string {
  switch (status) {
    case "OPEN":
      return "border-emerald-300 text-emerald-700 dark:text-emerald-400";
    case "PAUSED":
      return "border-amber-300 text-amber-700 dark:text-amber-400";
    case "CLOSED":
    case "FILLED":
      return "border-muted-foreground/40 text-muted-foreground";
    default:
      return "border-border text-muted-foreground";
  }
}

export type CandidatesViewMode = "cards" | "rows";
