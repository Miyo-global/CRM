
import { SYSTEM_ROLES, type SystemRole } from "./permissions";
import { isLegacyJobTitleRole } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";

export { SYSTEM_ROLES, type SystemRole };

export const ROLE_LABELS: Record<SystemRole, string> = {
  CEO: "Super Admin",
  HR: "HR",
  ADMIN: "Admin",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  RECRUITER: "Recruiter",
  EMPLOYEE: "Employee",
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

/**
 * QA-ROLE-01 / QA-ROLE-02: the roles a person can be given — invite, onboarding,
 * edit-employee and the members table all offer exactly this. Super Admin is
 * never assigned (there is one, the owner), the job-title roles are retired,
 * and Recruiter only exists while the ATS is on. Custom org roles are added by
 * the caller from the roles API.
 */
export function isAssignableSystemRole(role: string): boolean {
  if (role === "CEO") return false;
  if (isLegacyJobTitleRole(role)) return false;
  if (role === "RECRUITER") return ATS_MODULE_ENABLED;
  return true;
}

export const ASSIGNABLE_ROLE_OPTIONS: ReadonlyArray<{ value: SystemRole; label: string }> =
  ROLE_OPTIONS.filter((option) => isAssignableSystemRole(option.value));

/** Org roles from the roles API, minus Super Admin and the retired job titles. */
export function filterAssignableOrgRoles<T extends { slug: string }>(orgRoles: readonly T[]): T[] {
  return orgRoles.filter((role) => !isSystemRole(role.slug) || isAssignableSystemRole(role.slug));
}

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
