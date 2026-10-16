import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ROLES } from "@/lib/constants/roles";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";

/** Roles that carry full access — only the CEO may grant or take them away. */
const ELEVATED_ROLES: readonly string[] = [ROLES.CEO, ROLES.ADMIN];

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

  const actorIsCeo = input.actorRole === ROLES.CEO;
  if (
    !actorIsCeo &&
    (ELEVATED_ROLES.includes(newRole) || (currentRole && ELEVATED_ROLES.includes(currentRole)))
  ) {
    return { message: "Only the CEO can grant or remove the CEO and Admin roles.", status: 403 };
  }

  return null;
}
