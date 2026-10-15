

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.unknown().optional(),
  icon: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  parentPageId: z.number().nullable().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; pageId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, pageId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const pId = parseIdParam(pageId);
    if (pId === null) return err("Not found", 404);

    const body = await parseBody(req, updatePageSchema);

    if (body.parentPageId != null) {
      const parent = await db.query.pages.findFirst({
        where: and(eq(pages.id, body.parentPageId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)),
        columns: { id: true },
      });
      if (!parent) return err("Parent page not found", 404);
    }

    const [updated] = await db
      .update(pages)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(pages.id, pId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Page not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, pageId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const pId = parseIdParam(pageId);
    if (pId === null) return err("Not found", 404);

    const page = await db.query.pages.findFirst({
      where: and(eq(pages.id, pId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!page) return err("Page not found", 404);

    await db
      .update(pages)
      .set({ parentPageId: null })
      .where(and(eq(pages.parentPageId, pId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)));

    await db
      .delete(pages)
      .where(and(eq(pages.id, pId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
