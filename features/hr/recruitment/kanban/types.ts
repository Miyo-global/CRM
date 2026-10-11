import type { CandidateStatus, SlaCandidateStatus } from "@/types/hr";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { toneSoft, type Tone } from "@/lib/design/tones";

export interface ColumnConfig {
  id: CandidateStatus;
  label: string;
  bg: string;
  border: string;
  badge: string;
}

// Columns stay neutral (§8.4); the stage tone lives on the count pill.
const column = (id: CandidateStatus, label: string, t: Tone): ColumnConfig => ({
  id,
  label,
  bg: "bg-muted/60",
  border: "border-transparent",
  badge: toneSoft[t],
});

export const COLUMNS: ColumnConfig[] = [
  column("NEW", "New", "info"),
  column("SCREENING", "Screening", "teal"),
  column("INTERVIEW", "Interview", "plum"),
  column("OFFER", "Offer", "brand"),
  column("HIRED", "Hired", "success"),
  column("REJECTED", "Rejected", "danger"),
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
