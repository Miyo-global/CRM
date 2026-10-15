

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectViews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const updateViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().nullable().optional(),
  orderBy: z.string().nullable().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; viewId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, viewId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const vId = parseIdParam(viewId);
    if (vId === null) return err("Not found", 404);

    const body = await parseBody(req, updateViewSchema);

    const [updated] = await db
      .update(projectViews)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(projectViews.id, vId), eq(projectViews.projectId, projectId), eq(projectViews.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("View not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, viewId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const vId = parseIdParam(viewId);
    if (vId === null) return err("Not found", 404);

    const [deleted] = await db
      .delete(projectViews)
      .where(and(eq(projectViews.id, vId), eq(projectViews.projectId, projectId), eq(projectViews.orgId, session.orgId!)))
      .returning({ id: projectViews.id });

    if (!deleted) return err("View not found", 404);

    return ok({ success: true });
  });
}
