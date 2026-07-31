

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { intakeItems, tickets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const updateIntakeSchema = z.object({
  status: z.enum(["accepted", "declined", "duplicate"]).optional(),
  declineReason: z.string().min(1).optional(),
  linkedWorkItemId: z.number().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; requestId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, requestId } = await params;
    const projectId = Number(id);
    const rId = Number(requestId);
    if (!projectId || !rId) return err("Invalid id", 400);

    const body = await parseBody(req, updateIntakeSchema);

    const [item] = await db
      .select()
      .from(intakeItems)
      .where(and(eq(intakeItems.id, rId), eq(intakeItems.orgId, session.orgId!)));

    if (!item) return err("Intake request not found", 404);

    if (item.status !== "pending") {
      return err("This request has already been processed.", 409);
    }

    if (body.status === "accepted") {

      return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${item.projectId})`);

        const [maxTicket] = await tx
          .select({ max: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0)` })
          .from(tickets)
          .where(eq(tickets.projectId, item.projectId));

        const [ticket] = await tx
          .insert(tickets)
          .values({
            orgId: session.orgId!,
            projectId: item.projectId,
            title: item.title,
            description:
              typeof item.description === "object"
                ? JSON.stringify(item.description)
                : (item.description as string) ?? "",
            ticketNumber: (maxTicket?.max ?? 0) + 1,
            reporterId: session.user.id,
          })
          .returning();

        const [updated] = await tx
          .update(intakeItems)
          .set({
            status: "accepted",
            linkedWorkItemId: ticket.id,
            updatedAt: new Date(),
          })
          .where(eq(intakeItems.id, rId))
          .returning();

        return ok({ ...updated, linkedTicket: ticket });
      });
    }

    if (body.status === "declined") {
      if (!body.declineReason) {
        return err("declineReason is required when declining a request.", 400);
      }

      const [updated] = await db
        .update(intakeItems)
        .set({
          status: "declined",
          declineReason: body.declineReason,
          updatedAt: new Date(),
        })
        .where(eq(intakeItems.id, rId))
        .returning();

      return ok(updated);
    }

    if (body.status === "duplicate") {
      if (!body.linkedWorkItemId) {
        return err("linkedWorkItemId is required when marking as duplicate.", 400);
      }

      const [linkedTicket] = await db
        .select({ id: tickets.id })
        .from(tickets)
        .where(
          and(
            eq(tickets.id, body.linkedWorkItemId),
            eq(tickets.projectId, item.projectId),
            eq(tickets.orgId, session.orgId!)
          )
        );

      if (!linkedTicket) {
        return err("linkedWorkItemId does not reference a ticket in this project.", 400);
      }

      const [updated] = await db
        .update(intakeItems)
        .set({
          status: "duplicate",
          linkedWorkItemId: body.linkedWorkItemId,
          updatedAt: new Date(),
        })
        .where(eq(intakeItems.id, rId))
        .returning();

      return ok(updated);
    }

    return err("No valid status transition provided.", 400);
  });
}
