import { ROLES } from "@/lib/constants/roles";

/**
 * Admin-level roles — only the Super Admin may grant or take them away, so an
 * Admin invited a minute ago cannot mint more Admins (QA-AUTH-01).
 */
export const ELEVATED_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.HR];

export interface RoleChangeTarget {
  userId: string;
  role: string | null | undefined;
}

/**
 * Whether the actor may change the target's role at all — the members table
 * shows a role control only where this is true, and checkRoleAssignment
 * enforces the same rules on the server (QA-AUTH-01, QA-AUTH-02):
 * nobody changes their own role, the Super Admin's role never changes, and
 * Admin-level roles are moved only by the Super Admin.
 */
export function canChangeRoleOf(
  actor: { userId: string | null | undefined; role: string | null | undefined },
  target: RoleChangeTarget,
): boolean {
  if (!actor.userId || !actor.role) return false;
  if (actor.userId === target.userId) return false;
  if (target.role === ROLES.CEO) return false;
  if (actor.role === ROLES.CEO) return true;
  if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.HR) return false;
  return !ELEVATED_ROLES.includes(target.role ?? "");
}
