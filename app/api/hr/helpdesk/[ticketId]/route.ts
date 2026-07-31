import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  helpdeskTickets,
  helpdeskTicketComments,
  organizationMembers,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";

const updateTicketSchema = z
  .object({
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    resolution: z.string().trim().max(5000).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.assigneeId !== undefined || v.resolution !== undefined,
    { message: "No changes provided." },
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return withAuth(async (session) => {
    const { ticketId: ticketIdRaw } = await params;
    const ticketId = Number(ticketIdRaw);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return err("Invalid ticket id.", 400);
    }

    const ticket = await db.query.helpdeskTickets.findFirst({
      where: and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, session.orgId)),
    });
    if (!ticket) return err("Ticket not found.", 404);

    const isAdmin = isAdminOrOwner(session.user.role);
    const isAssignee = ticket.assigneeId === session.user.id;
    const isOwner = ticket.userId === session.user.id;

    if (!isAdmin && !isAssignee && !isOwner) {
      return err("Not authorized to update this ticket.", 403);
    }

    const data = await parseBody(req, updateTicketSchema);

    if (data.assigneeId !== undefined && !isAdmin) {
      return err("Only an administrator can assign tickets.", 403);
    }

    if (data.assigneeId) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.orgId, session.orgId),
          eq(organizationMembers.userId, data.assigneeId),
        ),
        columns: { userId: true },
      });
      if (!member) return err("Assignee must be a member of this organization.", 400);
    }

    const updates: Partial<typeof helpdeskTickets.$inferInsert> = { updatedAt: new Date() };
    const statusChanged = data.status !== undefined && data.status !== ticket.status;

    if (data.status !== undefined) updates.status = data.status;
    if (data.assigneeId !== undefined) updates.assigneeId = data.assigneeId;
    if (data.resolution !== undefined) updates.resolution = data.resolution || null;

    if (data.status === "DONE" && ticket.status !== "DONE") {
      updates.resolvedAt = new Date();
    } else if (data.status !== undefined && data.status !== "DONE") {
      updates.resolvedAt = null;
    }

    const [updated] = await db
      .update(helpdeskTickets)
      .set(updates)
      .where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, session.orgId)))
      .returning();

    if (statusChanged) {
      await db.insert(helpdeskTicketComments).values({
        orgId: session.orgId,
        ticketId,
        authorId: session.user.id,
        kind: "status_change",
        body: null,
        metadata: { from: ticket.status, to: data.status },
      });
    }

    return ok(updated);
  });
}
