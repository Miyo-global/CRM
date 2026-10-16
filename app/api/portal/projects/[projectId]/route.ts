import { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMilestones, projects, tickets } from "@/lib/db/schema";
import { parseIdParam } from "@/lib/projects/require-project-access";
import { clientPortalEnabled, resolveClientGrant } from "@/lib/projects/client-access";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const projectId = parseIdParam((await params).projectId);
    if (projectId === null) return err("Project not found", 404);

    // "Disabled" and "no access" are different answers, and the page can only
    // explain the first if the API says so (QA-D013).
    if (!(await clientPortalEnabled(session.orgId))) {
      return err("The client portal is turned off for this organization.", 403);
    }

    const grant = await resolveClientGrant(session.user.id, session.orgId, projectId);
    if (!grant) return err("Project not found", 404);

    const [project, milestones, work] = await Promise.all([
      db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        columns: { name: true, description: true, status: true, startDate: true, endDate: true },
      }),
      grant.canViewMilestones
        ? db
            .select({ id: projectMilestones.id, name: projectMilestones.name, targetDate: projectMilestones.targetDate, status: projectMilestones.status })
            .from(projectMilestones)
            .where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.clientVisible, true)))
            .orderBy(asc(projectMilestones.targetDate))
            .limit(100)
        : Promise.resolve([]),
      grant.canViewTasks
        ? db
            .select({ id: tickets.id, title: tickets.title, status: tickets.status, dueDate: tickets.dueDate })
            .from(tickets)
            .where(and(eq(tickets.projectId, projectId), eq(tickets.clientVisible, true), isNull(tickets.deletedAt)))
            .orderBy(asc(tickets.rank))
            .limit(100)
        : Promise.resolve([]),
    ]);

    return ok({
      project,
      capabilities: {
        canViewMilestones: grant.canViewMilestones,
        canViewTasks: grant.canViewTasks,
        canSubmitRequests: grant.canSubmitRequests,
      },
      milestones,
      tickets: work,
    });
  });
}
