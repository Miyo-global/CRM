

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.unknown().optional(),
  icon: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  parentPageId: z.number().nullable().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; pageId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, pageId } = await params;
    const projectId = Number(id);
    const pId = Number(pageId);
    if (!projectId || !pId) return err("Invalid id", 400);

    const body = await parseBody(req, updatePageSchema);

    const [updated] = await db
      .update(pages)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(pages.id, pId), eq(pages.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Page not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, pageId } = await params;
    const projectId = Number(id);
    const pId = Number(pageId);
    if (!projectId || !pId) return err("Invalid id", 400);

    await db
      .update(pages)
      .set({ parentPageId: null })
      .where(eq(pages.parentPageId, pId));

    await db
      .delete(pages)
      .where(and(eq(pages.id, pId), eq(pages.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
