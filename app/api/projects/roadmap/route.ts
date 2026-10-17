import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMilestones, tickets } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { visibleProjectIds } from "@/lib/projects/visible-projects";

/**
 * MIYO-0115: milestones from every project the viewer can see, for the
 * portfolio roadmap. The per-project timeline only ever showed one project.
 */
export async function GET() {
  return withAuth(async (session) => {
    const visibleIds = await visibleProjectIds(session);
    if (visibleIds.length === 0) return ok([]);

    const rows = await db
      .select({
        id: projectMilestones.id,
        name: projectMilestones.name,
        targetDate: projectMilestones.targetDate,
        status: projectMilestones.status,
        projectId: projects.id,
        projectName: projects.name,
        projectKey: projects.key,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projectMilestones.orgId, session.orgId),
          inArray(projectMilestones.projectId, visibleIds),
        ),
      )
      .orderBy(asc(projectMilestones.targetDate))
      .limit(500);

    const ids = rows.map((r) => r.id);
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
      rows.map((r) => {
        const c = byMilestone.get(r.id);
        const total = Number(c?.total ?? 0);
        const done = Number(c?.done ?? 0);
        return {
          ...r,
          ticketCount: total,
          doneCount: done,
          percentDone: total === 0 ? 0 : Math.round((done / total) * 100),
        };
      }),
    );
  });
}
