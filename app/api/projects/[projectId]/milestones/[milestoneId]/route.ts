import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).optional(),
});

type RouteContext = { params: Promise<{ projectId: string; milestoneId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { milestoneId: idStr } = await ctx.params;
    const milestoneId = Number(idStr);
    if (!Number.isFinite(milestoneId)) return err("Invalid milestone ID", 400);

    const input = await parseBody(req, updateSchema);
    

    const [updated] = await db
      .update(projectMilestones)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Milestone not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { milestoneId: idStr } = await ctx.params;
    const milestoneId = Number(idStr);
    if (!Number.isFinite(milestoneId)) return err("Invalid milestone ID", 400);

    const [deleted] = await db
      .delete(projectMilestones)
      .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Milestone not found", 404);
    return ok({ success: true });
  });
}
