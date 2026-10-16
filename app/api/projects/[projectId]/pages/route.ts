

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.unknown().optional(),
  // An emoji field the user typed in and then cleared arrives as "": store it
  // as no icon rather than an empty string (QA-0024).
  icon: z.string().trim().max(8).optional().transform((v) => (v ? v : undefined)),
  parentPageId: z.number().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const result = await db
      .select()
      .from(pages)
      .where(and(eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)))
      .orderBy(asc(pages.title))
      .limit(100);

    return ok(result);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const body = await parseBody(req, createPageSchema);

    if (body.parentPageId != null) {
      const parent = await db.query.pages.findFirst({
        where: and(eq(pages.id, body.parentPageId), eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)),
        columns: { id: true },
      });
      if (!parent) return err("Parent page not found", 404);
    }

    const [page] = await db
      .insert(pages)
      .values({
        projectId,
        orgId: session.orgId!,
        title: body.title,
        content: body.content ?? null,
        icon: body.icon ?? null,
        parentPageId: body.parentPageId,
        createdBy: session.user.id,
      })
      .returning();

    return ok(page, 201);
  });
}
