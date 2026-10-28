import { type NextRequest } from "next/server";
import { withAuth, ok, err, serverError } from "@/lib/api/helpers";
import { getSupportTicket, logSupportActivity } from "@/server/queries/support";
import { db } from "@/lib/db";
import { supportTickets, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendSupportTicketStatusEmail, sendSupportTicketCreatedEmail } from "@/lib/email";
import { isSupportStaff } from "@/lib/constants/support-sla";
import { afterResponse } from "@/lib/after-response";

const updateSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"])
    .optional(),
  // null unassigns.
  assigneeId: z.string().min(1).nullable().optional(),
});

const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "CLOSED", "OPEN"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "CLOSED", "OPEN"],
  RESOLVED: ["CLOSED", "OPEN", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const viewerId = isSupportStaff(session.user.role) ? undefined : session.user.id;
      const ticket = await getSupportTicket(session.orgId, ticketId, viewerId);
      if (!ticket) return err("Ticket not found", 404);
      return ok(ticket);
    } catch (error) {
      return serverError(error, { route: "support/[supportTicketId]", orgId: session.orgId }, "Failed to load ticket.");
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ supportTicketId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { supportTicketId: id } = await params;
      const ticketId = Number(id);
      if (!Number.isFinite(ticketId)) return err("Invalid ID", 400);

      const ticket = await db.query.supportTickets.findFirst({
        where: and(
          eq(supportTickets.id, ticketId),
          eq(supportTickets.orgId, session.orgId)
        ),
      });
      if (!ticket) return err("Ticket not found", 404);

      // Non-staff may only update their own tickets and never reassign them.
      const staff = isSupportStaff(session.user.role);
      if (!staff && ticket.createdBy !== session.user.id && ticket.assigneeId !== session.user.id) {
        return err("Ticket not found", 404);
      }

      const body = await req.json();
      const input = updateSchema.parse(body);
      if (!staff && input.assigneeId !== undefined) {
        return err("Only the support team can assign tickets.", 403);
      }

      if (input.assigneeId) {
        const member = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.orgId, session.orgId),
            eq(organizationMembers.userId, input.assigneeId),
          ),
          columns: { role: true },
        });
        if (!member || !isSupportStaff(member.role)) {
          return err("Assignee must be a member of the support team.", 400);
        }
      }

      if (
        input.status &&
        input.status !== ticket.status &&
        !(STATUS_TRANSITIONS[ticket.status] ?? []).includes(input.status)
      ) {
        return err(
          `Cannot change ticket status from ${ticket.status} to ${input.status}`,
          400
        );
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.status) {
        updateData.status = input.status;
        if (input.status === "RESOLVED") updateData.resolvedAt = new Date();
        if (input.status === "CLOSED") updateData.closedAt = new Date();
      }
      if (input.assigneeId !== undefined)
        updateData.assigneeId = input.assigneeId;

      await db
        .update(supportTickets)
        .set(updateData)
        .where(
          and(
            eq(supportTickets.id, ticketId),
            eq(supportTickets.orgId, session.orgId)
          )
        );

      if (input.status && input.status !== ticket.status) {
        const STATUS_LABELS: Record<string, string> = {
          OPEN: "reopened",
          IN_PROGRESS: "moved to in progress",
          WAITING: "set to waiting",
          RESOLVED: "resolved",
          CLOSED: "closed",
        };
        void logSupportActivity({
          orgId: session.orgId,
          type: input.status === "WAITING" ? "escalation" : "ticket",
          message: `Ticket "${ticket.title}" ${STATUS_LABELS[input.status] ?? `set to ${input.status}`}`,
          person: session.user.name ?? null,
        });
      }

      if (input.assigneeId && input.assigneeId !== ticket.assigneeId) {
        afterResponse("support/[supportTicketId]", async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, input.assigneeId!),
            columns: { name: true },
          });
          await logSupportActivity({
            orgId: session.orgId,
            type: "ticket",
            message: `Ticket "${ticket.title}" assigned to ${assignee?.name ?? "a team member"}`,
            person: session.user.name ?? null,
          });
        });
      }

      if (input.status) {
        afterResponse("support/[supportTicketId]", async () => {
          const creator = await db.query.users.findFirst({
            where: eq(users.id, ticket.createdBy),
            columns: { email: true, name: true },
          });
          if (creator?.email) {
            await sendSupportTicketStatusEmail(creator.email, {
              id: ticketId,
              subject: ticket.title,
              status: input.status!,
              updatedBy: session.user.name ?? "Support",
            });
          }
        });
      }

      if (input.assigneeId && input.assigneeId !== ticket.assigneeId) {
        afterResponse("support/[supportTicketId]", async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, input.assigneeId!),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendSupportTicketCreatedEmail(assignee.email, {
              id: ticketId,
              subject: ticket.title,
              priority: ticket.priority ?? "MEDIUM",
              requesterName: session.user.name ?? "Support",
            });
          }
        });
      }

      return ok({ success: true });
    } catch (error) {
      return serverError(error, { route: "support/[supportTicketId]", orgId: session.orgId }, "Failed to update ticket.");
    }
  });
}
