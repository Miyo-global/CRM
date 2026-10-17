import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, ticketAssignees } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or, desc, asc, sql } from "drizzle-orm";
import { visibleProjectIds } from "@/lib/projects/visible-projects";

/**
 * MIYO-0113: every ticket assigned to me, across the projects I can see.
 * The per-project "My tickets" page only ever showed one project.
 */
export async function GET() {
  return withAuth(async (session) => {
    const visibleIds = await visibleProjectIds(session);
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
