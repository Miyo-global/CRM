import { appUrl } from "../app-url";
import { COMPANY_ADDRESS, COMPANY_LEGAL_NAME, HR_EMAIL, SUPPORT_EMAIL } from "@/lib/constants/company";
import { escapeHtml } from "./base";
import { EMAIL_CATALOG, type EmailTemplateId } from "./catalog.generated";

export type { EmailTemplateId };

export type EmailVars = Record<string, string | number | null | undefined>;

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  /** Hand-written plain-text part from email-templates/<id>.txt (MIYO-0098). */
  text: string;
}

/** Values every template may use; callers override any of them. */
export function sharedEmailVars(): Record<string, string> {
  return {
    org_name: COMPANY_LEGAL_NAME,
    org_address: COMPANY_ADDRESS,
    app_url: appUrl,
    logo_url: `${appUrl}/logo.png`,
    support_email: SUPPORT_EMAIL,
    hr_email: HR_EMAIL,
  };
}

// *_url values land in href="": escaping alone lets javascript:/data: through,
// and meeting_url is user-entered, so only absolute http(s) links render.
const SAFE_URL = /^https?:\/\//i;

function fill(template: string, vars: Record<string, string>, escape: boolean): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    let value = vars[key] ?? "";
    if (escape && key.endsWith("_url") && !SAFE_URL.test(value.trim())) value = "";
    return escape ? escapeHtml(value) : value;
  });
}

/**
 * With no company address configured the footer read "Miyo Global ·" with
 * nothing after the dot (FR1-024); drop the separator along with the address.
 */
function dropEmptyAddress(template: string, vars: Record<string, string>): string {
  if (vars.org_address?.trim()) return template;
  return template.replace(/\s*(?:&middot;|·)\s*\{\{\s*org_address\s*\}\}/g, "");
}

/**
 * Render one of the email-templates/ templates (MIYO-0097). Values are
 * HTML-escaped in the HTML part only; the subject, preheader and text part get
 * the raw values, so "A & B" never shows up as "A &amp; B" in a subject
 * line (MIYO-0099).
 */
export function renderEmail(id: EmailTemplateId, vars: EmailVars = {}): RenderedEmail {
  const entry = EMAIL_CATALOG[id];
  if (!entry) throw new Error(`Unknown email template: ${id}`);
  const all: Record<string, string> = { ...sharedEmailVars() };
  for (const [k, v] of Object.entries(vars)) if (v != null) all[k] = String(v);
  return {
    subject: fill(entry.subject, all, false),
    preheader: fill(entry.preheader, all, false),
    html: fill(dropEmptyAddress(entry.html, all), all, true),
    text: fill(dropEmptyAddress(entry.text, all), all, false),
  };
}

/** Placeholders a template uses, for tests and callers that build vars. */
export function templatePlaceholders(id: EmailTemplateId): string[] {
  const { subject, preheader, html, text } = EMAIL_CATALOG[id];
  const keys = new Set<string>();
  for (const part of [subject, preheader, html, text]) {
    for (const m of part.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)) keys.add(m[1]);
  }
  return [...keys].sort();
}
