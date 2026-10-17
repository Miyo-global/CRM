import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth/helpers";

/**
 * Ids of the live projects this session can view: every project in the org
 * for an admin or owner, otherwise the ones they manage or are a member of.
 * Used by the cross-project pages (MIYO-0113, MIYO-0115).
 */
export async function visibleProjectIds(session: {
  user: { id: string; role?: string | null };
  orgId: string;
}): Promise<number[]> {
  const scope = [eq(projects.orgId, session.orgId), isNull(projects.deletedAt)];

  if (!isAdminOrOwner(session.user.role)) {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, session.user.id));
    const memberIds = memberOf.map((m) => m.projectId);
    scope.push(
      memberIds.length > 0
        ? or(inArray(projects.id, memberIds), eq(projects.managerId, session.user.id))!
        : eq(projects.managerId, session.user.id),
    );
  }

  const rows = await db.select({ id: projects.id }).from(projects).where(and(...scope));
  return rows.map((p) => p.id);
}
