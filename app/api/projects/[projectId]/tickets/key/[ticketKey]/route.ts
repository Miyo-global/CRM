import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { parseTicketKey } from "@/lib/projects/ticket-key";

type RouteParams = { params: Promise<{ projectId: string; ticketKey: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketKey } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, guard.projectId),
      columns: { key: true },
    });
    const ticketNumber = project ? parseTicketKey(ticketKey, project.key) : null;
    if (ticketNumber === null) return err("Ticket not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.projectId, guard.projectId),
        eq(tickets.orgId, session.orgId),
        eq(tickets.ticketNumber, ticketNumber),
        isNull(tickets.deletedAt),
      ),
      columns: { id: true, ticketNumber: true, title: true },
    });
    if (!ticket) return err("Ticket not found", 404);
    return ok(ticket);
  });
}
