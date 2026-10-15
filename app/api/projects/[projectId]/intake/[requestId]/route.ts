import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { intakeItems, tickets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import { createTicket } from "@/lib/projects/create-ticket";
import { allOrgMembers } from "@/lib/projects/assignable-users";
import { logger } from "@/lib/logger";

const updateIntakeSchema = z.object({
  status: z.enum(["accepted", "declined", "duplicate"]),
  declineReason: z.string().trim().min(1).max(2000).optional(),
  linkedWorkItemId: z.number().int().positive().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().max(200).optional(),
  ticketStatus: z.string().min(1).max(80).optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; requestId: string }> };

function descriptionText(value: unknown): string | undefined {
  if (value == null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, requestId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const rId = parseIdParam(requestId);
    if (rId === null) return err("Intake request not found", 404);

    const body = await parseBody(req, updateIntakeSchema);
    const scope = and(eq(intakeItems.id, rId), eq(intakeItems.projectId, projectId), eq(intakeItems.orgId, session.orgId));

    const item = await db.query.intakeItems.findFirst({ where: scope });
    if (!item) return err("Intake request not found", 404);
    if (item.status !== "pending") return err("This request has already been processed.", 409);

    const isAccept = body.status === "accepted";
    if (!isAccept && (body.priority || body.assigneeId || body.ticketStatus)) {
      return err("Priority, assignee and status can only be set when accepting", 400);
    }

    if (body.status === "declined") {
      if (!body.declineReason) return err("Give a reason for declining this request", 400);
      const [updated] = await db
        .update(intakeItems)
        .set({ status: "declined", declineReason: body.declineReason, updatedAt: new Date() })
        .where(and(scope, eq(intakeItems.status, "pending")))
        .returning();
      return updated ? ok(updated) : err("This request has already been processed.", 409);
    }

    if (body.status === "duplicate") {
      if (!body.linkedWorkItemId) return err("Choose the ticket this duplicates", 400);
      const linked = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, body.linkedWorkItemId),
          eq(tickets.projectId, projectId),
          eq(tickets.orgId, session.orgId),
          isNull(tickets.deletedAt),
        ),
        columns: { id: true },
      });
      if (!linked) return err("That ticket is not in this project", 400);
      const [updated] = await db
        .update(intakeItems)
        .set({ status: "duplicate", linkedWorkItemId: linked.id, updatedAt: new Date() })
        .where(and(scope, eq(intakeItems.status, "pending")))
        .returning();
      return updated ? ok(updated) : err("This request has already been processed.", 409);
    }

    if (body.assigneeId && !(await allOrgMembers(session.orgId, [body.assigneeId]))) {
      return err("Assignee must be a member of this organization", 400);
    }

    const [claimed] = await db
      .update(intakeItems)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(and(scope, eq(intakeItems.status, "pending")))
      .returning({ id: intakeItems.id });
    if (!claimed) return err("This request has already been processed.", 409);

    try {
      const ticket = await createTicket(
        { orgId: session.orgId, projectId, actorId: session.user.id },
        {
          title: item.title.slice(0, 500),
          description: descriptionText(item.description),
          type: "TASK",
          priority: body.priority,
          assigneeId: body.assigneeId,
          status: body.ticketStatus,
        },
      );
      const [updated] = await db
        .update(intakeItems)
        .set({ linkedWorkItemId: ticket.id, updatedAt: new Date() })
        .where(scope)
        .returning();
      return ok({ ...updated, linkedTicket: ticket });
    } catch (error) {
      logger.error("Failed to accept intake request", { error, intakeId: rId });
      await db.update(intakeItems).set({ status: "pending", updatedAt: new Date() }).where(scope);
      return err("Could not create the ticket. The request is still pending.", 500);
    }
  });
}
