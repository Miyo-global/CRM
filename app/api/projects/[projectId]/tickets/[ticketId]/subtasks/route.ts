import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid, projectId: pid } = await params;
    const guard = await requireProjectAccess(session, pid, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(tid);
    if (ticketId === null) return err("Not found", 404);

    const parent = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!),
        isNull(tickets.deletedAt)
      ),
      columns: { id: true },
    });
    if (!parent) return err("Ticket not found", 404);

    const subtasks = await db.query.tickets.findMany({
      where: and(
        eq(tickets.parentTicketId, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!),
        isNull(tickets.deletedAt)
      ),
      with: { assignee: { columns: { id: true, name: true, email: true, image: true } } },
      limit: 100,
    });

    return ok(subtasks);
  });
}
