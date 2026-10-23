import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, tickets, ticketAssignees, users } from "@/lib/db/schema";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const activeProjects = await db.query.projects.findMany({
      where: and(eq(projects.orgId, session.orgId), eq(projects.status, "ACTIVE"), isNull(projects.deletedAt)),
      columns: { id: true, name: true, key: true },
    });

    if (activeProjects.length === 0) return ok([]);

    const projectIds = activeProjects.map((p) => p.id);

    const [primaryAllocation, multiAllocation, memberRows] = await Promise.all([
      db
        .select({
          assigneeId: tickets.assigneeId,
          projectId: tickets.projectId,
          ticketId: tickets.id,
        })
        .from(tickets)
        .where(
          and(
            eq(tickets.orgId, session.orgId),
            inArray(tickets.projectId, projectIds),
            isNull(tickets.deletedAt),
            sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
          ),
        ),
      db
        .select({
          assigneeId: ticketAssignees.userId,
          projectId: tickets.projectId,
          ticketId: tickets.id,
        })
        .from(ticketAssignees)
        .innerJoin(tickets, eq(ticketAssignees.ticketId, tickets.id))
        .where(
          and(
            eq(tickets.orgId, session.orgId),
            inArray(tickets.projectId, projectIds),
            isNull(tickets.deletedAt),
            sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
          ),
        ),
      // Members with no open work are listed too, at 0 open (R2-PRJ-06).
      db
        .select({ assigneeId: projectMembers.userId, projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds)),
    ]);

    const allAssigneeIds = new Set<string>();
    for (const r of primaryAllocation) {
      if (r.assigneeId) allAssigneeIds.add(r.assigneeId);
    }
    for (const r of multiAllocation) {
      if (r.assigneeId) allAssigneeIds.add(r.assigneeId);
    }
    for (const r of memberRows) allAssigneeIds.add(r.assigneeId);

    if (allAssigneeIds.size === 0) return ok([]);

    const members = await db.query.users.findMany({
      where: inArray(users.id, [...allAssigneeIds]),
      columns: { id: true, name: true, email: true, image: true },
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const projectMap = new Map(activeProjects.map((p) => [p.id, p]));

    const userProjectTickets = new Map<string, Map<number, Set<number>>>();

    const addTicket = (userId: string, projectId: number, ticketId?: number) => {
      if (!userProjectTickets.has(userId)) {
        userProjectTickets.set(userId, new Map());
      }
      const projMap = userProjectTickets.get(userId)!;
      if (!projMap.has(projectId)) {
        projMap.set(projectId, new Set());
      }
      if (ticketId !== undefined) projMap.get(projectId)!.add(ticketId);
    };

    for (const r of primaryAllocation) {
      if (r.assigneeId && r.projectId) {
        addTicket(r.assigneeId, r.projectId, r.ticketId);
      }
    }
    for (const r of multiAllocation) {
      if (r.assigneeId && r.projectId) {
        addTicket(r.assigneeId, r.projectId, r.ticketId);
      }
    }
    for (const r of memberRows) addTicket(r.assigneeId, r.projectId);

    const result = [];
    for (const [userId, projMap] of userProjectTickets.entries()) {
      const user = memberMap.get(userId);
      if (!user) continue;

      const byProject = [];
      let totalOpen = 0;

      for (const [projectId, ticketSet] of projMap.entries()) {
        const project = projectMap.get(projectId);
        if (!project) continue;

        const openCount = ticketSet.size;
        totalOpen += openCount;
        byProject.push({
          projectId: project.id,
          projectName: project.name,
          projectKey: project.key,
          open: openCount,
        });
      }

      result.push({
        user,
        totalOpen,
        byProject,
      });
    }

    result.sort((a, b) => b.totalOpen - a.totalOpen);
    return ok(result);
  });
}
