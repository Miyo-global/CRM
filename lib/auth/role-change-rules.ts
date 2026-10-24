import { ROLES } from "@/lib/constants/roles";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";
import { isAssignableSystemRole, isSystemRole } from "@/lib/rbac/roles";

/**
 * Admin-level roles — only the Super Admin may grant or take them away, so an
 * Admin invited a minute ago cannot mint more Admins (QA-AUTH-01).
 */
export const ELEVATED_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.HR];

type Role = string | null | undefined;

/**
 * Whether a system role holds a permission by default. Pure, so the buttons
 * and the API routes read the same matrix /settings/permissions shows
 * (R3-ROLE-01). Custom roles never pick up a Super-Admin-only permission here.
 */
export function roleHasPermission(role: Role, permission: string): boolean {
  return !!role && (ROLE_DEFAULT_PERMISSIONS[role] ?? []).includes(permission);
}

/**
 * The one rule for which role an actor may hand out (R3-HR-02). Super Admin:
 * Admin, HR, Employee or a custom role; Admin and HR: Employee only. Nobody
 * grants Super Admin, and the retired job-title roles are never offered.
 * The invite form, the members table, the Add-employee wizard and every API
 * route that writes a role filter or check with this.
 */
export function canGrantRole(actorRole: Role, targetRole: Role): boolean {
  const role = targetRole?.trim().toUpperCase();
  if (!role || role === ROLES.CEO) return false;
  if (isSystemRole(role) && !isAssignableSystemRole(role)) return false;
  if (roleHasPermission(actorRole, "roles:manage")) return true;
  if (actorRole !== ROLES.ADMIN && actorRole !== ROLES.HR) return false;
  return role === ROLES.EMPLOYEE;
}

export interface RoleChangeTarget {
  userId: string;
  role: string | null | undefined;
}

/**
 * Whether the actor may act on the target at all — change their role, start
 * their termination. The members table and the termination picker show only
 * these people, and the API routes enforce the same rule (QA-AUTH-01,
 * QA-AUTH-02, R3-ADM-08): nobody acts on themselves, nobody acts on the Super
 * Admin, and Admin-level accounts are handled only by the Super Admin.
 */
export function canManage(
  actor: { userId: string | null | undefined; role: Role },
  target: RoleChangeTarget,
): boolean {
  if (!actor.userId || !actor.role) return false;
  if (actor.userId === target.userId) return false;
  if (target.role === ROLES.CEO) return false;
  if (roleHasPermission(actor.role, "roles:manage")) return true;
  if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.HR) return false;
  return !ELEVATED_ROLES.includes(target.role ?? "");
}

/** The members table's name for canManage. */
export const canChangeRoleOf = canManage;
