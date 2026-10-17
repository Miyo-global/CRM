import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectUpdates } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { userColumns } from "@/lib/projects/ticket-columns";

/** MIYO-0116: status posts on a project. */

const UPDATE_STATUSES = ["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const;

const createSchema = z.object({
  status: z.enum(UPDATE_STATUSES),
  body: z.string().trim().min(1).max(4000),
}).strict();

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await ctx.params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const updates = await db.query.projectUpdates.findMany({
      where: and(
        eq(projectUpdates.projectId, guard.projectId),
        eq(projectUpdates.orgId, session.orgId),
      ),
      with: { author: { columns: userColumns } },
      orderBy: [desc(projectUpdates.createdAt)],
      limit: 20,
    });

    return ok(updates);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await ctx.params;
    // Only the people who run the project speak for it.
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;

    const body = await parseBody(req, createSchema);

    const [created] = await db
      .insert(projectUpdates)
      .values({
        orgId: session.orgId,
        projectId: guard.projectId,
        status: body.status,
        body: body.body,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}
