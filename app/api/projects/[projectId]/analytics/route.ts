

import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getProjectAnalytics } from "@/server/queries/projects";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
      columns: { id: true, managerId: true },
    });
    if (!project) return err("Project not found", 404);

    if (!isAdminOrOwner(session.user.role) && project.managerId !== session.user.id) {
      const memberOf = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.userId, session.user.id),
            eq(projectMembers.projectId, projectId)
          )
        );
      if (memberOf.length === 0) return err("Project not found", 404);
    }

    const analytics = await getProjectAnalytics(session.orgId!, projectId);

    return ok(analytics);
  });
}
