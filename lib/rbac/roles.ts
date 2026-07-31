
import { SYSTEM_ROLES, type SystemRole } from "./permissions";

export { SYSTEM_ROLES, type SystemRole };

export const ROLE_LABELS: Record<SystemRole, string> = {
  CEO: "CEO",
  HR: "HR",
  SALES: "Sales",
  CUSTOMER_SUPPORT: "Customer Support",
  ENGINEERING: "Engineering",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
  DIGITAL_MARKETING: "Digital Marketing",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
};

export const ADMIN_ROLES: readonly string[] = ["CEO", "HR", "ADMIN"] as const;

export const BRANCH_ROLES: ReadonlyArray<SystemRole> = ["BRANCH_MANAGER", "BRANCH_HR"] as const;

export const CRM_ROLES: ReadonlyArray<SystemRole> = ["CEO", "HR", "SALES", "BRANCH_MANAGER", "BRANCH_HR"] as const;

export function isSystemRole(role: string | undefined | null): role is SystemRole {
  return SYSTEM_ROLES.includes(role as SystemRole);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return ADMIN_ROLES.includes(role as SystemRole);
}

export function isBranchRole(role: string | undefined | null): boolean {
  return BRANCH_ROLES.includes(role as SystemRole);
}

export function getRoleLabel(role: string | undefined | null): string {
  if (!role || !isSystemRole(role)) return role ?? "Unknown";
  return ROLE_LABELS[role];
}
