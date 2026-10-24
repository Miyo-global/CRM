import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import { moveTicket } from "@/lib/projects/move-ticket";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";
import { ticketConflict } from "@/lib/projects/ticket-columns";

const moveSchema = z.object({
  status: z.string().min(1).max(80).optional(),
  beforeTicketId: z.number().int().positive().optional(),
  afterTicketId: z.number().int().positive().optional(),
  version: z.number().int().positive().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Ticket not found", 404);

    const body = await parseBody(req, moveSchema);
    const outcome = await moveTicket({ orgId: session.orgId, projectId: guard.projectId, ticketId: id, ...body });

    switch (outcome.kind) {
      case "not_found":
        return err("Ticket not found", 404);
      case "invalid":
        return err(outcome.message, 400);
      case "conflict":
        return ticketConflict(outcome.currentVersion);
      case "wip":
        return err(outcome.message, 409);
      case "moved":
        if (outcome.fromStatus !== outcome.ticket.status) {
          await recordTicketActivity(
            { orgId: session.orgId, projectId: guard.projectId, ticketId: id, actorId: session.user.id },
            [{ action: "status_changed", field: "status", fromValue: outcome.fromStatus, toValue: outcome.ticket.status }],
          );
          // MIYO-0122: dragging a card between columns is a move too.
          void import("@/lib/webhooks/dispatch").then(({ dispatchWebhook }) =>
            dispatchWebhook(session.orgId, "ticket.moved", {
              ticketId: id,
              projectId: guard.projectId,
              status: outcome.ticket.status,
              fromStatus: outcome.fromStatus,
            }),
          );
        }
        return ok({ ticket: outcome.ticket });
    }
  });
}
