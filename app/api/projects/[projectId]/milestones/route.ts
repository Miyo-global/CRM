import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones, projects } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["PENDING", "ACHIEVED", "MISSED"]).default("PENDING"),
});

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const milestones = await db.query.projectMilestones.findMany({
      where: and(
        eq(projectMilestones.projectId, projectId),
        eq(projectMilestones.orgId, session.orgId),
      ),
      orderBy: [asc(projectMilestones.targetDate)],
    });

    return ok(milestones);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true, managerId: true },
    });
    if (!project) return err("Project not found", 404);

    if (!isAdminOrOwner(session.user.role) && project.managerId !== session.user.id) {
      return err("You do not have permission to create milestones for this project.", 403);
    }

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
