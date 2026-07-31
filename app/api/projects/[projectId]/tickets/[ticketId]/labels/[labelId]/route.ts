import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabelMappings, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string; labelId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId: tid, labelId: lid } = await params;
    const ticketId = Number(tid);
    const labelId = Number(lid);
    if (!ticketId || !labelId) return err("Invalid ids", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.orgId, session.orgId!)),
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
