import { toWordsInr } from "@/lib/hr/payslip-view-model";
import { format } from "date-fns";

export interface OfferLetterCandidateVars {
  firstName: string;
  lastName: string;
  email: string;
}

export interface OfferLetterOfferVars {
  offeredSalary: string | null;
  offeredDesignation: string | null;
  joiningDate: string | null;
  validUntil: string | null;
}

export interface OfferLetterOrgVars {
  name: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } | null;
}

function fmtPdfInr(amount: number): string {
  const s = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs.${s}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMMM yyyy");
  } catch {
    return dateStr;
  }
}

function buildOrgAddress(org: OfferLetterOrgVars): string {
  const a = org.address;
  if (!a) return "";
  return [a.line1, a.line2, a.city, a.state, a.country, a.postalCode]
    .filter(Boolean)
    .join(", ");
}

export function buildOfferLetterVars(
  candidate: OfferLetterCandidateVars,
  offer: OfferLetterOfferVars,
  org: OfferLetterOrgVars,
  now: Date
): Record<string, string> {
  const annualRaw = offer.offeredSalary ? Number(offer.offeredSalary) : 0;
  const monthlyRaw = annualRaw > 0 ? Math.round(annualRaw / 12) : 0;

  return {
    candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
    candidateFirstName: candidate.firstName,
    candidateLastName: candidate.lastName,
    candidateEmail: candidate.email,
    generationDate: format(now, "dd MMMM yyyy"),
    date: format(now, "dd MMMM yyyy"),
    designation: offer.offeredDesignation ?? "",
    joiningDate: formatDate(offer.joiningDate),
    validUntil: formatDate(offer.validUntil),
    annualSalary: annualRaw > 0 ? fmtPdfInr(annualRaw) : "",
    annualSalaryWords: annualRaw > 0 ? toWordsInr(annualRaw) : "",
    monthlySalary: monthlyRaw > 0 ? fmtPdfInr(monthlyRaw) : "",
    monthlySalaryWords: monthlyRaw > 0 ? toWordsInr(monthlyRaw) : "",
    orgName: org.name,
    orgAddress: buildOrgAddress(org),
  };
}

export function applyOfferTokens(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return vars[key] ?? "";
  });
}

const VARIABLE_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const VARIABLE_KEY_MAX = 64;

export function isValidVariableKey(key: string): boolean {
  return key.length > 0 && key.length <= VARIABLE_KEY_MAX && VARIABLE_KEY_RE.test(key);
}

export function normalizeVariableKey(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([0-9])/, "v$1")
    .slice(0, VARIABLE_KEY_MAX);
}

export const BUILT_IN_OFFER_TOKEN_KEYS: readonly string[] = [
  "candidateName",
  "candidateFirstName",
  "candidateLastName",
  "candidateEmail",
  "date",
  "generationDate",
  "designation",
  "joiningDate",
  "validUntil",
  "annualSalary",
  "annualSalaryWords",
  "monthlySalary",
  "monthlySalaryWords",
  "orgName",
  "orgAddress",
];

const SYSTEM_FIELD_ALIASES: Record<string, string> = {
  name: "candidateName",
  candidate: "candidateName",
  candidatefullname: "candidateName",
  fullname: "candidateName",
  firstname: "candidateFirstName",
  lastname: "candidateLastName",
  email: "candidateEmail",
  candidateemailaddress: "candidateEmail",
  emailaddress: "candidateEmail",
  position: "designation",
  role: "designation",
  jobtitle: "designation",
  title: "designation",
  startdate: "joiningDate",
  joindate: "joiningDate",
  dateofjoining: "joiningDate",
  doj: "joiningDate",
  expirydate: "validUntil",
  offervaliduntil: "validUntil",
  ctc: "annualSalary",
  annualctc: "annualSalary",
  salary: "annualSalary",
  annualsalary: "annualSalary",
  ctcinwords: "annualSalaryWords",
  monthlyctc: "monthlySalary",
  company: "orgName",
  companyname: "orgName",
  organisation: "orgName",
  organization: "orgName",
  organisationname: "orgName",
  companyaddress: "orgAddress",
  organisationaddress: "orgAddress",
  address: "orgAddress",
};

function canonicalForm(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveCustomVariableToSystemField(variableKey: string): string | null {
  const canonical = canonicalForm(variableKey);
  for (const builtIn of BUILT_IN_OFFER_TOKEN_KEYS) {
    if (canonicalForm(builtIn) === canonical) return builtIn;
  }
  return SYSTEM_FIELD_ALIASES[canonical] ?? null;
}

export function unmappedVariablePlaceholder(label: string): string {
  return `[${label}]`;
}

export interface OfferLetterCustomVariableDef {
  variableKey: string;
  label: string;
}

export function buildCustomVariableVars(
  customVariables: readonly OfferLetterCustomVariableDef[],
  systemVars: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cv of customVariables) {
    if (systemVars[cv.variableKey] !== undefined) continue;
    const mapped = resolveCustomVariableToSystemField(cv.variableKey);
    if (mapped && systemVars[mapped] !== undefined && systemVars[mapped] !== "") {
      out[cv.variableKey] = systemVars[mapped];
    } else {
      out[cv.variableKey] = unmappedVariablePlaceholder(cv.label || cv.variableKey);
    }
  }
  return out;
}

export const OFFER_LETTER_TOKEN_LEGEND: readonly string[] = [
  "{{candidateName}} — Full name of the candidate",
  "{{candidateFirstName}} — First name",
  "{{candidateLastName}} — Last name",
  "{{candidateEmail}} — Candidate email",
  "{{date}} / {{generationDate}} — Date letter is generated",
  "{{designation}} — Offered designation",
  "{{joiningDate}} — Joining date (formatted)",
  "{{validUntil}} — Offer expiry date (formatted)",
  "{{annualSalary}} — Annual CTC e.g. Rs.12,00,000.00",
  "{{annualSalaryWords}} — Annual CTC in words e.g. Twelve Lakh Rupees Only",
  "{{monthlySalary}} — Monthly CTC e.g. Rs.1,00,000.00",
  "{{monthlySalaryWords}} — Monthly CTC in words",
  "{{orgName}} — Organisation name",
  "{{orgAddress}} — Organisation address",
];
