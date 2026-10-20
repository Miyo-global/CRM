import { NextRequest } from "next/server";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, ticketComments, tickets } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/audit-log";
import { parseIdParam } from "@/lib/projects/require-project-access";
import { hasFullAccess } from "@/lib/constants/roles";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const projectId = parseIdParam(rawProjectId);
    if (projectId === null) return err("Project not found", 404);
    if (!hasFullAccess(session.user.role)) return err("Only admins can restore projects", 403);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true, key: true, name: true, deletedAt: true },
    });
    if (!project) return err("Project not found", 404);
    if (!project.deletedAt) return err("Project is not deleted", 409);

    const clash = await db.query.projects.findFirst({
      where: and(eq(projects.orgId, session.orgId), eq(projects.key, project.key), isNull(projects.deletedAt), ne(projects.id, projectId)),
      columns: { id: true },
    });
    if (clash) return err(`Another project already uses the key ${project.key}`, 409);

    const deletedAt = project.deletedAt;
    const restored = await db.transaction(async (tx) => {
      const rows = await tx
        .update(tickets)
        .set({ deletedAt: null })
        .where(and(eq(tickets.projectId, projectId), eq(tickets.deletedAt, deletedAt)))
        .returning({ id: tickets.id });
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        await tx
          .update(ticketComments)
          .set({ deletedAt: null })
          .where(and(inArray(ticketComments.ticketId, ids), eq(ticketComments.deletedAt, deletedAt)));
      }
      await tx.update(projects).set({ deletedAt: null }).where(and(eq(projects.id, projectId), isNotNull(projects.deletedAt)));
      return ids.length;
    });

    void createAuditLog({
      action: "project.restored",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(projectId),
      targetType: "project",
      metadata: { name: project.name },
    }).catch(() => {});

    return ok({ restored: true, restoredTickets: restored });
  });
}
