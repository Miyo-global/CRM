import { fromISODateString } from "@/lib/date-utils";

/**
 * Registered legal entity, printed on offer letters, payslips and termination
 * letters. Set COMPANY_LEGAL_NAME once the entity is registered.
 */
export const COMPANY_LEGAL_NAME =
  process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Miyo Global";

/**
 * Incorporation date. This is the minimum selectable joining date in HR
 * onboarding, so a value later than a real hire date will reject that hire.
 */
export const COMPANY_ESTABLISHED_DATE_ISO =
  process.env.NEXT_PUBLIC_COMPANY_ESTABLISHED_DATE || "2024-10-27";

export function getCompanyEstablishedDate(): Date {
  return fromISODateString(COMPANY_ESTABLISHED_DATE_ISO);
}

/** Fallback contact number on generated documents when the org has none set. */
export const COMPANY_PHONE = process.env.NEXT_PUBLIC_COMPANY_PHONE || "";

/**
 * Registered office address. Used as the fallback on offer letters and as the
 * `{{orgAddress}}` token in NDA and appointment templates, which state it as
 * the company's registered office — so an unset value is safer than a stale one.
 */
export const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "";

/**
 * Centralised company contact/URL constants.
 *
 * These use `||`, not `??`, deliberately. Hosting platforms commonly define an
 * env var with an empty value, and `??` only replaces null/undefined — so `??`
 * would let "" through. A blank NEXT_PUBLIC_APP_URL reaching `new URL()` in the
 * root layout's metadataBase fails the production build outright.
 */
export const CRM_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://crm.miyoglobal.com";

/** Public marketing site, linked from the careers pages. */
export const COMPANY_WEBSITE_URL =
  process.env.NEXT_PUBLIC_COMPANY_WEBSITE_URL || "https://miyoglobal.com";

export const NOREPLY_EMAIL =
  process.env.EMAIL_FROM_ADDRESS || "noreply@miyoglobal.com";

export const HR_EMAIL =
  process.env.HR_NOTIFICATION_EMAIL || "hr@miyoglobal.com";

export const INFO_EMAIL =
  process.env.INFO_EMAIL || "info@miyoglobal.com";

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@miyoglobal.com";
