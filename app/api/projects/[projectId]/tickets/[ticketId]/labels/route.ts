import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabelMappings, ticketLabels, tickets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const addLabelSchema = z.object({ labelId: z.number() }).strict();

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid } = await params;
    const guard = await requireProjectAccess(session, pid, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(tid);
    if (ticketId === null) return err("Not found", 404);

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

    const body = await parseBody(req, addLabelSchema);

    const label = await db.query.ticketLabels.findFirst({
      where: and(eq(ticketLabels.id, body.labelId), eq(ticketLabels.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!label) return err("Label not found", 404);

    await db
      .insert(ticketLabelMappings)
      .values({ ticketId, labelId: body.labelId })
      .onConflictDoNothing();

    return ok({ success: true }, 201);
  });
}
