import { EMAIL_CATALOG, type EmailTemplateId } from "./catalog.generated";
import { templatePlaceholders } from "./render";

/**
 * MIYO-0155: stand-in values so any template can be rendered for a test send
 * or a preview without the caller knowing its placeholders.
 */
const BY_NAME: Record<string, string> = {
  amount: "12,500",
  approver_name: "Priya Sharma",
  asset_name: "MacBook Pro 14",
  asset_tag: "MG-LT-014",
  check_in_time: "10:42",
  date: "20 Apr 2026",
  deactivated_on: "20 Apr 2026",
  due_date: "27 Apr 2026",
  employee_name: "Rahul Verma",
  end_date: "22 Apr 2026",
  first_name: "Rahul",
  manager_name: "Priya Sharma",
  month_label: "April 2026",
  organizer_name: "Priya Sharma",
  reason: "Family function",
  start_date: "20 Apr 2026",
  ticket_key: "MG-128",
  token_url: "https://example.invalid/sample-link",
};

/** Numbers read better than "Sample" where a count is expected. */
const NUMERIC_SUFFIXES = ["_count", "_days", "_pct", "_total", "_number"];

export function sampleVarsFor(id: EmailTemplateId): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of templatePlaceholders(id)) {
    if (BY_NAME[key]) {
      vars[key] = BY_NAME[key];
    } else if (NUMERIC_SUFFIXES.some((suffix) => key.endsWith(suffix))) {
      vars[key] = "3";
    } else if (key.endsWith("_url") || key.endsWith("_link")) {
      vars[key] = "https://example.invalid/sample-link";
    } else if (key.endsWith("_date") || key.endsWith("_on")) {
      vars[key] = "20 Apr 2026";
    } else if (key.endsWith("_time")) {
      vars[key] = "10:42";
    } else if (key.endsWith("_name")) {
      vars[key] = "Rahul Verma";
    } else {
      vars[key] = "Sample";
    }
  }
  return vars;
}

/** True when the id names one of the 91 file templates. */
export function isEmailTemplateId(id: string): id is EmailTemplateId {
  return Object.prototype.hasOwnProperty.call(EMAIL_CATALOG, id);
}
