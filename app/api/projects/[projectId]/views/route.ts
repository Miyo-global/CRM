

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectViews } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createViewSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()).default({}),
  groupBy: z.string().optional(),
  orderBy: z.string().optional(),
  layoutType: z
    .enum(["board", "list", "table", "calendar", "gantt"])
    .default("board"),
  isPinned: z.boolean().default(false),
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
      .from(projectViews)
      .where(
        and(
          eq(projectViews.projectId, projectId),
          eq(projectViews.orgId, session.orgId!)
        )
      )
      .orderBy(desc(projectViews.isPinned), projectViews.name)
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

    const body = await parseBody(req, createViewSchema);

    const [view] = await db
      .insert(projectViews)
      .values({
        projectId,
        orgId: session.orgId!,
        createdBy: session.user.id,
        name: body.name,
        filters: body.filters,
        groupBy: body.groupBy,
        orderBy: body.orderBy,
        layoutType: body.layoutType,
        isPinned: body.isPinned,
      })
      .returning();

    return ok(view, 201);
  });
}
