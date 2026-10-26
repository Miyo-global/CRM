/** Module prefixes that add nothing to the label ("hr.leave_cancelled" → "Leave cancelled"). */
const NAMESPACES = new Set(["hr", "org", "kb", "ats"]);

/**
 * A readable label for a stored audit action code (R2-SYS-04). The code stays
 * the filter value; only the display changes.
 */
const SPECIAL_LABELS: Record<string, string> = {
  EMPLOYEE_PT_SET: "Professional tax set",
  EMPLOYEE_PT_UPDATED: "Professional tax updated",
};

export function auditActionLabel(action: string): string {
  if (SPECIAL_LABELS[action]) return SPECIAL_LABELS[action];
  const parts = action.split(".");
  if (parts.length > 1 && NAMESPACES.has(parts[0])) parts.shift();
  const text = parts.join(" ").replace(/_/g, " ").toLowerCase().trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : action;
}
