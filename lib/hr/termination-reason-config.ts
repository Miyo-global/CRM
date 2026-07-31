import {
  DEFAULT_TERMINATION_REASONS,
  OTHER_TERMINATION_REASON,
} from "@/lib/constants/hr-separation";

export type TerminationReasonConfig = {
  label: string;
  isActive?: boolean | null;
};

export { DEFAULT_TERMINATION_REASONS, OTHER_TERMINATION_REASON };

export function activeTerminationReasonLabels(
  rows: TerminationReasonConfig[],
): string[] {
  const labels = rows.filter((r) => r.isActive !== false).map((r) => r.label);
  if (!labels.includes(OTHER_TERMINATION_REASON)) {
    labels.push(OTHER_TERMINATION_REASON);
  }
  return labels;
}

export function isAllowedTerminationReason(
  reason: string,
  rows: TerminationReasonConfig[],
): boolean {
  if (reason === OTHER_TERMINATION_REASON) return true;
  return rows.some((r) => r.isActive !== false && r.label === reason);
}

export function normalizeTerminationReasonLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function isDuplicateTerminationReasonLabel(
  label: string,
  rows: TerminationReasonConfig[],
  excludeLabel?: string,
): boolean {
  const normalized = normalizeTerminationReasonLabel(label);
  const exclude = excludeLabel
    ? normalizeTerminationReasonLabel(excludeLabel)
    : null;
  return rows.some(
    (row) =>
      normalizeTerminationReasonLabel(row.label) === normalized &&
      normalizeTerminationReasonLabel(row.label) !== exclude,
  );
}
