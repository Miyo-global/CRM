import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).default("PENDING"),
}).strict();

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const guard = await requireProjectAccess(session, idStr, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const milestones = await db.query.projectMilestones.findMany({
      where: and(
        eq(projectMilestones.projectId, projectId),
        eq(projectMilestones.orgId, session.orgId),
      ),
      orderBy: [asc(projectMilestones.targetDate)],
      limit: 100,
    });

    return ok(milestones);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const guard = await requireProjectAccess(session, idStr, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const input = await parseBody(req, createSchema);
    

    const [milestone] = await db
      .insert(projectMilestones)
      .values({
        projectId,
        orgId: session.orgId,
        name: input.name,
        description: input.description ?? null,
        targetDate: input.targetDate,
        status: input.status,
        createdBy: session.user.id,
      })
      .returning();

    return ok(milestone, 201);
  });
}
