import { NextRequest } from "next/server";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets } from "@/lib/db/schema";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Ticket not found", 404);

    const scope = and(eq(tickets.id, id), eq(tickets.projectId, guard.projectId), eq(tickets.orgId, session.orgId));
    const ticket = await db.query.tickets.findFirst({ where: scope, columns: { id: true, deletedAt: true } });
    if (!ticket) return err("Ticket not found", 404);
    if (!ticket.deletedAt) return err("Ticket is not archived", 409);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, guard.projectId), isNull(projects.archivedAt)),
      columns: { id: true },
    });
    if (!project) return err("Restore the project before restoring its tickets", 409);

    const [restored] = await db
      .update(tickets)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(scope, isNotNull(tickets.deletedAt)))
      .returning({ id: tickets.id, version: tickets.version });
    if (!restored) return err("Ticket is not archived", 409);

    await recordTicketActivity(
      { orgId: session.orgId, projectId: guard.projectId, ticketId: id, actorId: session.user.id },
      [{ action: "restored", field: null, fromValue: null, toValue: null }],
    );
    return ok({ ticket: restored });
  });
}
