import { capitalise, titleCase } from "@/lib/format-utils";

export const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
  TEMPORARY: "Temporary",
  CONSULTANT: "Consultant",
  APPRENTICESHIP: "Apprenticeship",
  COMMISSION_BASED: "Commission-Based",
  REMOTE: "Remote",
};

export const JOB_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  PAUSED: "Paused",
  CLOSED: "Closed",
  FILLED: "Filled",
};

/** Title-case job titles: "senior frontend developer" → "Senior Frontend Developer" */
export function formatJobPostingTitle(title: string): string {
  return titleCase(title.trim());
}

/** Title-case locations; supports comma-separated values: "hyderabad, remote" → "Hyderabad, Remote" */
export function formatJobPostingLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(",")
    .map((part) => titleCase(part.trim()))
    .filter(Boolean)
    .join(", ");
}

export function formatJobTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  return JOB_TYPE_LABELS[type] ?? titleCase(type.replace(/_/g, " "));
}

export function formatJobPostingStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  return JOB_STATUS_LABELS[status] ?? capitalise(status);
}
