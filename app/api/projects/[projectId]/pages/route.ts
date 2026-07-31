

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.unknown().optional(),
  icon: z.string().optional(),
  parentPageId: z.number().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const result = await db
      .select()
      .from(pages)
      .where(and(eq(pages.projectId, projectId), eq(pages.orgId, session.orgId!)))
      .orderBy(asc(pages.title));

    return ok(result);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const body = await parseBody(req, createPageSchema);

    const [page] = await db
      .insert(pages)
      .values({
        projectId,
        orgId: session.orgId!,
        title: body.title,
        content: body.content ?? null,
        icon: body.icon,
        parentPageId: body.parentPageId,
        createdBy: session.user.id,
      })
      .returning();

    return ok(page, 201);
  });
}
