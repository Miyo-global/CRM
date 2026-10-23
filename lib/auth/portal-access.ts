import { isAdminOrOwner } from "@/lib/constants/roles";

/**
 * Portal Access OFF keeps a non-admin out of the whole app: no sign-in, no
 * password reset, no page (R2-LC-17, R2-LC-18, R2-LC-19). Admin roles always
 * keep access, as the dashboard layout has always treated them.
 */
export function isPortalAccessBlocked(
  role: string | null | undefined,
  hasDashboardAccess: boolean | null | undefined,
): boolean {
  return !isAdminOrOwner(role) && hasDashboardAccess === false;
}
