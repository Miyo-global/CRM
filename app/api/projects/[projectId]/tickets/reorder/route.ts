

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, projects, projectMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

async function checkProjectAccess(
  session: { user: { id: string; role?: string }; orgId: string },
  projectId: number
) {
  if (isAdminOrOwner(session.user.role)) return true;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
    columns: { managerId: true },
  });
  if (!project) return false;
  if (project.managerId === session.user.id) return true;
  const membership = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);
  return membership.length > 0;
}

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      order: z.number(),
    })
  ),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const hasAccess = await checkProjectAccess(
      { user: session.user, orgId: session.orgId! },
      projectId
    );
    if (!hasAccess) return err("Forbidden", 403);

    const { items } = await parseBody(req, reorderSchema);

    if (items.length === 0) return ok({ success: true });

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(tickets)
          .set({ status: item.status, order: item.order, updatedAt: new Date() })
          .where(
            and(
              eq(tickets.id, item.id),
              eq(tickets.projectId, projectId),
              eq(tickets.orgId, session.orgId!)
            )
          );
      }
    });

    return ok({ success: true });
  });
}
