import type { CandidateStatus, JobPostingStatus } from "@/types/hr";
import { toneDot, toneSoft, type Tone } from "@/lib/design/tones";

export const STATUSES: { value: CandidateStatus; label: string; color: string }[] = [
  { value: "NEW", label: "New", color: toneDot.info },
  { value: "SCREENING", label: "Screening", color: toneDot.teal },
  { value: "INTERVIEW", label: "Interview", color: toneDot.plum },
  { value: "OFFER", label: "Offer", color: toneDot.brand },
  { value: "HIRED", label: "Hired", color: toneDot.success },
  { value: "REJECTED", label: "Rejected", color: toneDot.danger },
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

// Free categorical (rendered on outline Badges) → tag cycle, soft fill, no border.
export const SOURCE_BADGE_CLASSES: Record<string, string> = {
  LINKEDIN: `${toneSoft.info} border-transparent`,
  NAUKRI: `${toneSoft.teal} border-transparent`,
  REFERRAL: `${toneSoft.plum} border-transparent`,
  CAMPUS: `${toneSoft.brand} border-transparent`,
  JOB_PORTAL: `${toneSoft.warning} border-transparent`,
  CAREERS_PAGE: `${toneSoft.success} border-transparent`,
  DIRECT: `${toneSoft.neutral} border-transparent`,
};

export const JOB_STATUS_LABELS: Record<JobPostingStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  PAUSED: "Paused",
  CLOSED: "Closed",
  FILLED: "Filled",
};

export const CANDIDATE_STATUS_TONE: Record<CandidateStatus, Tone> = {
  NEW: "info",
  SCREENING: "teal",
  INTERVIEW: "plum",
  OFFER: "brand",
  HIRED: "success",
  REJECTED: "danger",
};

export function candidateStatusTone(status: string | null): Tone {
  return CANDIDATE_STATUS_TONE[status as CandidateStatus] ?? "neutral";
}

export function candidateStatusLabel(status: string | null): string {
  return STATUSES.find((s) => s.value === status)?.label ?? status ?? "—";
}

export const JOB_STATUS_TONE: Partial<Record<JobPostingStatus, Tone>> = {
  OPEN: "success",
  PAUSED: "warning",
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
      return `${toneSoft.success} border-transparent`;
    case "PAUSED":
      return `${toneSoft.warning} border-transparent`;
    default:
      return `${toneSoft.neutral} border-transparent`;
  }
}

export type CandidatesViewMode = "cards" | "rows";
