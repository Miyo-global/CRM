
import { SYSTEM_ROLES, type SystemRole } from "./permissions";

export { SYSTEM_ROLES, type SystemRole };

export const ROLE_LABELS: Record<SystemRole, string> = {
  CEO: "CEO",
  HR: "HR",
  ADMIN: "Admin",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  RECRUITER: "Recruiter",
};

export const ADMIN_ROLES: readonly string[] = ["CEO", "HR", "ADMIN"] as const;

/**
 * Every system role as a {value,label} pair — the one list every role select,
 * badge and filter renders from, so a role added here is assignable everywhere
 * and never shows as a raw enum (A12, A13).
 */
export const ROLE_OPTIONS: ReadonlyArray<{ value: SystemRole; label: string }> = SYSTEM_ROLES.map(
  (role) => ({ value: role, label: ROLE_LABELS[role] }),
);

export const CRM_ROLES: ReadonlyArray<SystemRole> = ["CEO", "HR", "SALES"] as const;

export function isSystemRole(role: string | undefined | null): role is SystemRole {
  return SYSTEM_ROLES.includes(role as SystemRole);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role as SystemRole);
}

export function getRoleLabel(role: string | undefined | null): string {
  if (!role || !isSystemRole(role)) return role ?? "Unknown";
  return ROLE_LABELS[role];
}
