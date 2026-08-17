import { format } from "date-fns";
import {
  TERMINATION_STATUSES,
  TERMINATION_STATUS_LABELS,
} from "@/lib/constants/hr-separation";
import type { TerminationStatus } from "@/lib/api/hooks/hr";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

export { getInitials } from "@/lib/format-utils";


export function statusVariant(
  status: TerminationStatus | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "DRAFT":
      return "outline";
    case "PENDING_CEO":
      return "secondary";
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "SENT":
      return "secondary";
    case "COMPLETED":
      return "default";
    default:
      return "outline";
  }
}

export function statusLabel(status: TerminationStatus | null): string {
  if (status && status in TERMINATION_STATUS_LABELS) {
    return TERMINATION_STATUS_LABELS[status as keyof typeof TERMINATION_STATUS_LABELS];
  }
  return status ?? "Unknown";
}

export function buildLetterPreview(params: {
  employeeName: string;
  designation: string;
  effectiveDate: string;
  reasons: string[];
  explanation: string;
  noticePeriodWaived: boolean;
  severanceAmount: string;
}): string {
  const {
    employeeName,
    designation,
    effectiveDate,
    reasons,
    explanation,
    noticePeriodWaived,
    severanceAmount,
  } = params;

  const dateStr = effectiveDate
    ? format(new Date(effectiveDate), "MMMM d, yyyy")
    : "[Date not set]";
  const reasonList =
    reasons.length > 0 ? reasons.join(", ") : "[No reasons selected]";
  const severanceLine =
    severanceAmount && Number(severanceAmount) > 0
      ? `\nSeverance Amount: ${CURRENCY_SYMBOL}${Number(severanceAmount).toLocaleString(DEFAULT_LOCALE)}`
      : "";
  const noticeLine = noticePeriodWaived
    ? "\nNote: Notice period has been waived."
    : "";

  return `TERMINATION LETTER

Dear ${employeeName || "[Employee Name]"},

This letter serves as formal notice of the termination of your employment as ${designation || "[Designation]"} with our organization, effective ${dateStr}.

Reason(s) for Termination:
${reasonList}

Details:
${explanation || "[Explanation not provided]"}
${severanceLine}${noticeLine}

Please ensure all company property, access credentials, and pending deliverables are handed over before your last working day.

Regards,
Human Resources Department`;
}


export type StatusFilter = "ALL" | TerminationStatus;

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...TERMINATION_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: TERMINATION_STATUS_LABELS[s],
  })),
];
