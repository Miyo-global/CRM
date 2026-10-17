import { type NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones, tickets } from "@/lib/db/schema";
import { eq, and, asc, inArray, isNull, sql } from "drizzle-orm";
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

    // MIYO-0114: how far each release is, from the tickets assigned to it.
    const ids = milestones.map((m) => m.id);
    const counts = ids.length
      ? await db
          .select({
            milestoneId: tickets.milestoneId,
            total: sql<number>`count(*)`,
            done: sql<number>`count(*) filter (where ${tickets.status} = 'DONE')`,
          })
          .from(tickets)
          .where(and(inArray(tickets.milestoneId, ids), isNull(tickets.deletedAt)))
          .groupBy(tickets.milestoneId)
      : [];
    const byMilestone = new Map(counts.map((c) => [c.milestoneId, c]));

    return ok(
      milestones.map((m) => {
        const c = byMilestone.get(m.id);
        const total = Number(c?.total ?? 0);
        const done = Number(c?.done ?? 0);
        return {
          ...m,
          ticketCount: total,
          doneCount: done,
          percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
        };
      }),
    );
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
