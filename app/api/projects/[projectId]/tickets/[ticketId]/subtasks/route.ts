import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid, projectId: pid } = await params;
    const ticketId = Number(tid);
    const projectId = Number(pid);
    if (!ticketId || !projectId) return err("Invalid ticket id", 400);

    const parent = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!)
      ),
      columns: { id: true, assigneeId: true, reporterId: true },
      with: { assignees: { columns: { userId: true } } },
    });
    if (!parent) return err("Ticket not found", 404);

    if (!isAdminOrOwner(session.user.role)) {
      const isAssignee =
        parent.assigneeId === session.user.id ||
        parent.assignees.some((a) => a.userId === session.user.id);
      const isReporter = parent.reporterId === session.user.id;
      if (!isAssignee && !isReporter) {
        return err("You don't have access to this ticket's details.", 403);
      }
    }

    const subtasks = await db.query.tickets.findMany({
      where: and(
        eq(tickets.parentTicketId, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!)
      ),
      with: { assignee: true },
    });

    return ok(subtasks);
  });
}
