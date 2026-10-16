import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabelMappings, tickets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string; labelId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid, labelId: lid } = await params;
    const guard = await requireProjectAccess(session, pid, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(tid);
    const labelId = parseIdParam(lid);
    if (ticketId === null || labelId === null) return err("Not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!),
        isNull(tickets.deletedAt)
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    await db
      .delete(ticketLabelMappings)
      .where(
        and(
          eq(ticketLabelMappings.ticketId, ticketId),
          eq(ticketLabelMappings.labelId, labelId)
        )
      );

    return ok({ success: true });
  });
}
