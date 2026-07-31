

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectViews } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const createViewSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()).default({}),
  groupBy: z.string().optional(),
  orderBy: z.string().optional(),
  layoutType: z
    .enum(["board", "list", "table", "calendar", "gantt"])
    .default("board"),
  isPinned: z.boolean().default(false),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const result = await db
      .select()
      .from(projectViews)
      .where(
        and(
          eq(projectViews.projectId, projectId),
          eq(projectViews.orgId, session.orgId!)
        )
      )
      .orderBy(desc(projectViews.isPinned), projectViews.name);

    return ok(result);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

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
