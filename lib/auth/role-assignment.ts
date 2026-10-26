import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ROLES, isLegacyJobTitleRole } from "@/lib/constants/roles";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { ELEVATED_ROLES, canGrantRole, roleHasPermission } from "./role-change-rules";

export { canChangeRoleOf, canGrantRole, canManage } from "./role-change-rules";

export interface RoleAssignmentCheck {
  orgId: string;
  /** Role of the user performing the change. */
  actorRole: string | null | undefined;
  actorId: string;
  /** User whose role is being set; omit when creating a new employee. */
  targetUserId?: string | null;
  /** Role the target currently holds, if any. */
  targetCurrentRole?: string | null;
  newRole: string;
}

export interface RoleAssignmentError {
  message: string;
  status: 400 | 403;
}

/**
 * The one gate for assigning a system role (QA-0002). Every caller that writes
 * `users.role` routes through this, so HR cannot promote itself or anyone else
 * to CEO/ADMIN, and an unknown role string is rejected instead of stored.
 */
export async function checkRoleAssignment(
  input: RoleAssignmentCheck,
): Promise<RoleAssignmentError | null> {
  const newRole = input.newRole.trim().toUpperCase();

  const isKnown =
    (SYSTEM_ROLES as readonly string[]).includes(newRole) ||
    !!(await db.query.roles.findFirst({
      where: and(eq(roles.slug, newRole), eq(roles.orgId, input.orgId)),
      columns: { id: true },
    }));
  if (!isKnown) {
    return { message: `"${input.newRole}" is not a role in this organisation.`, status: 400 };
  }

  const currentRole = input.targetCurrentRole?.trim().toUpperCase() ?? null;
  const unchanged = currentRole === newRole;
  if (unchanged) return null;

  if (input.targetUserId && input.targetUserId === input.actorId) {
    return { message: "You cannot change your own system role.", status: 403 };
  }

  // R3-SA-07: a terminated or deactivated account keeps the role it left with.
  if (input.targetUserId) {
    const target = await db.query.users.findFirst({
      where: eq(users.id, input.targetUserId),
      columns: { isActive: true },
    });
    if (target?.isActive === false) {
      return { message: "This account is terminated or inactive. Its role cannot be changed.", status: 400 };
    }
  }

  // QA-AUTH-02: there is exactly one Super Admin, the owner. The role is
  // never handed out or taken away through a role change.
  if (currentRole === ROLES.CEO) {
    return { message: "The Super Admin's role cannot be changed.", status: 403 };
  }
  if (newRole === ROLES.CEO) {
    return { message: "There is one Super Admin, the owner. The role cannot be granted.", status: 403 };
  }

  // QA-ROLE-01: the job-title roles are retired; job titles live in the
  // designation field and everyone non-admin is an Employee.
  if (isLegacyJobTitleRole(newRole)) {
    return { message: `"${input.newRole}" is retired. Assign Employee and set the designation instead.`, status: 400 };
  }

  const actorManagesRoles = roleHasPermission(input.actorRole, "roles:manage");
  if (!actorManagesRoles && currentRole && ELEVATED_ROLES.includes(currentRole)) {
    return { message: "Only the Super Admin can change an Admin or HR account's role.", status: 403 };
  }
  // R3-HR-02: the same rule the role pickers filter with.
  if (!canGrantRole(input.actorRole, newRole)) {
    return {
      message: ELEVATED_ROLES.includes(newRole)
        ? "Only the Super Admin or an Admin can grant the Admin and HR roles."
        : "You can only assign the Employee role.",
      status: 403,
    };
  }

  return null;
}
