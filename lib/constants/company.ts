import { fromISODateString } from "@/lib/date-utils";

export const COMPANY_LEGAL_NAME = "Miyo Global";

export const MIYO_GLOBAL_ESTABLISHED_DATE_ISO = "2024-10-27";

export function getMiyoGlobalEstablishedDate(): Date {
  return fromISODateString(MIYO_GLOBAL_ESTABLISHED_DATE_ISO);
}

/**
 * Centralised company contact/URL constants.
 * Replaces hardcoded strings in 9 locations across email templates, API routes, and feature files.
 * Values fall back to env vars so staging/prod environments can override without code changes.
 */
export const CRM_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.miyoglobal.com";

export const NOREPLY_EMAIL =
  process.env.EMAIL_FROM_ADDRESS ?? "noreply@miyoglobal.com";

export const HR_EMAIL =
  process.env.HR_NOTIFICATION_EMAIL ?? "hr@miyoglobal.com";

export const INFO_EMAIL =
  process.env.INFO_EMAIL ?? "info@miyoglobal.com";

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? "support@miyoglobal.com";
