

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectViews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  groupBy: z.string().nullable().optional(),
  orderBy: z.string().nullable().optional(),
  layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
  isPinned: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; viewId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, viewId } = await params;
    const projectId = Number(id);
    const vId = Number(viewId);
    if (!projectId || !vId) return err("Invalid id", 400);

    const body = await parseBody(req, updateViewSchema);

    const [updated] = await db
      .update(projectViews)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(projectViews.id, vId), eq(projectViews.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("View not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, viewId } = await params;
    const projectId = Number(id);
    const vId = Number(viewId);
    if (!projectId || !vId) return err("Invalid id", 400);

    await db
      .delete(projectViews)
      .where(and(eq(projectViews.id, vId), eq(projectViews.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
