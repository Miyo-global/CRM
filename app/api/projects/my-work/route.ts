import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, tickets, ticketAssignees } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or, desc, asc, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

/**
 * MIYO-0113: every ticket assigned to me, across the projects I can see.
 * The per-project "My tickets" page only ever showed one project.
 */
export async function GET() {
  return withAuth(async (session) => {
    const projectScope = [eq(projects.orgId, session.orgId), isNull(projects.deletedAt)];

    if (!isAdminOrOwner(session.user.role)) {
      const memberOf = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, session.user.id));
      const memberIds = memberOf.map((m) => m.projectId);
      projectScope.push(
        memberIds.length > 0
          ? or(inArray(projects.id, memberIds), eq(projects.managerId, session.user.id))!
          : eq(projects.managerId, session.user.id),
      );
    }

    const visible = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(...projectScope));
    const visibleIds = visible.map((p) => p.id);
    if (visibleIds.length === 0) return ok([]);

    // Assigned to me either as the single assignee or through the
    // multi-assignee table.
    const alsoAssigned = db
      .select({ ticketId: ticketAssignees.ticketId })
      .from(ticketAssignees)
      .where(eq(ticketAssignees.userId, session.user.id));

    const rows = await db.query.tickets.findMany({
      where: and(
        eq(tickets.orgId, session.orgId),
        isNull(tickets.deletedAt),
        inArray(tickets.projectId, visibleIds),
        or(
          eq(tickets.assigneeId, session.user.id),
          inArray(tickets.id, alsoAssigned),
        ),
      ),
      columns: {
        id: true,
        title: true,
        type: true,
        status: true,
        priority: true,
        ticketNumber: true,
        dueDate: true,
        projectId: true,
        updatedAt: true,
      },
      with: { project: { columns: { id: true, name: true, key: true } } },
      orderBy: [
        // Dated work first, soonest due at the top; undated work after it.
        sql`case when ${tickets.dueDate} is null then 1 else 0 end`,
        asc(tickets.dueDate),
        desc(tickets.updatedAt),
      ],
      limit: 300,
    });

    return ok(rows);
  });
}
