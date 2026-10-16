import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).optional(),
  clientVisible: z.boolean().optional(),
}).strict();

type RouteContext = { params: Promise<{ projectId: string; milestoneId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, milestoneId: idStr } = await ctx.params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const milestoneId = parseIdParam(idStr);
    if (milestoneId === null) return err("Not found", 404);

    const input = await parseBody(req, updateSchema);
    

    const [updated] = await db
      .update(projectMilestones)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), eq(projectMilestones.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Milestone not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, milestoneId: idStr } = await ctx.params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const milestoneId = parseIdParam(idStr);
    if (milestoneId === null) return err("Not found", 404);

    const [deleted] = await db
      .delete(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), eq(projectMilestones.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Milestone not found", 404);
    return ok({ success: true });
  });
}
