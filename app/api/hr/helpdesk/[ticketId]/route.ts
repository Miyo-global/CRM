import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  helpdeskTickets,
  helpdeskTicketComments,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { cleanRequiredText } from "@/lib/validations/text-rules";

const updateTicketSchema = z
  .object({
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CLOSED", "CANCELLED"]).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    resolution: z.string().trim().max(5000).optional(),
    title: cleanRequiredText("Title", 200, 3).optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined || v.assigneeId !== undefined || v.resolution !== undefined || v.title !== undefined,
    { message: "No changes provided." },
  );

// Done and Closed both count as resolved; Cancelled was never resolved (BUG-35).
const RESOLVED_STATUSES: readonly string[] = ["DONE", "CLOSED"];

function parseTicketId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return withAuth(async (session) => {
    const ticketId = parseTicketId((await params).ticketId);
    if (!ticketId) return err("Invalid ticket id.", 400);

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

    // The creator or an admin may fix the title until the ticket is resolved (QA-BUG-17).
    if (data.title !== undefined && data.title !== ticket.title) {
      if (!isOwner && !isAdmin) return err("Only the creator or an admin can edit the title.", 403);
      if (["DONE", "CLOSED", "CANCELLED"].includes(ticket.status ?? "")) {
        return err("A resolved ticket's title can't be changed.", 400);
      }
      const [duplicate] = await db
        .select({ id: helpdeskTickets.id })
        .from(helpdeskTickets)
        .where(
          and(
            eq(helpdeskTickets.orgId, session.orgId),
            ne(helpdeskTickets.id, ticketId),
            sql`lower(${helpdeskTickets.title}) = ${data.title.toLowerCase()}`,
            sql`${helpdeskTickets.status} NOT IN ('DONE', 'CLOSED', 'CANCELLED')`,
          ),
        )
        .limit(1);
      if (duplicate) return err("An open ticket with this title already exists.", 409);
    }

    let assigneeName: string | null = null;
    if (data.assigneeId) {
      const [member] = await db
        .select({ name: users.name, email: users.email })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.userId, data.assigneeId)))
        .limit(1);
      if (!member) return err("Assignee must be a member of this organization.", 400);
      assigneeName = member.name ?? member.email;
    }

    const updates: Partial<typeof helpdeskTickets.$inferInsert> = { updatedAt: new Date() };
    const statusChanged = data.status !== undefined && data.status !== ticket.status;
    const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== ticket.assigneeId;

    if (data.status !== undefined) updates.status = data.status;
    if (data.assigneeId !== undefined) updates.assigneeId = data.assigneeId;
    if (data.resolution !== undefined) updates.resolution = data.resolution || null;
    if (data.title !== undefined) updates.title = data.title;

    if (data.status !== undefined && RESOLVED_STATUSES.includes(data.status)) {
      if (!RESOLVED_STATUSES.includes(ticket.status ?? "")) updates.resolvedAt = new Date();
    } else if (data.status !== undefined) {
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

    // Assignment goes in the activity trail too (R2-HD-01).
    if (assigneeChanged) {
      await db.insert(helpdeskTicketComments).values({
        orgId: session.orgId,
        ticketId,
        authorId: session.user.id,
        kind: "assignment",
        body: null,
        metadata: { from: ticket.assigneeId, to: data.assigneeId ?? null, toName: assigneeName },
      });
    }

    return ok(updated);
  });
}

/** Admin-only hard delete, for spam and test tickets (BUG-35). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only an administrator can delete tickets.", 403);
    }
    const ticketId = parseTicketId((await params).ticketId);
    if (!ticketId) return err("Invalid ticket id.", 400);

    const deleted = await db.transaction(async (tx) => {
      // The comments FK has no cascade, so they go first.
      await tx
        .delete(helpdeskTicketComments)
        .where(and(eq(helpdeskTicketComments.ticketId, ticketId), eq(helpdeskTicketComments.orgId, session.orgId)));
      return tx
        .delete(helpdeskTickets)
        .where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, session.orgId)))
        .returning({ id: helpdeskTickets.id });
    });
    if (deleted.length === 0) return err("Ticket not found.", 404);
    return ok({ id: ticketId });
  });
}
