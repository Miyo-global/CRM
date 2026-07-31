import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { helpdeskTickets, helpdeskTicketComments, users } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";

const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(5000),
  kind: z.enum(["comment", "internal_note"]).optional(),
});

async function loadTicketForAccess(orgId: string, ticketId: number) {
  return db.query.helpdeskTickets.findFirst({
    where: and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, orgId)),
    columns: { id: true, userId: true, assigneeId: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return withAuth(async (session) => {
    const { ticketId: ticketIdRaw } = await params;
    const ticketId = Number(ticketIdRaw);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return err("Invalid ticket id.", 400);
    }

    const ticket = await loadTicketForAccess(session.orgId, ticketId);
    if (!ticket) return err("Ticket not found.", 404);

    const isAdmin = isAdminOrOwner(session.user.role);
    const canSeeInternal = isAdmin || ticket.assigneeId === session.user.id;

    if (!isAdmin && ticket.userId !== session.user.id && ticket.assigneeId !== session.user.id) {
      return err("Not authorized to view this ticket.", 403);
    }

    const rows = await db
      .select({
        id: helpdeskTicketComments.id,
        ticketId: helpdeskTicketComments.ticketId,
        authorId: helpdeskTicketComments.authorId,
        kind: helpdeskTicketComments.kind,
        body: helpdeskTicketComments.body,
        metadata: helpdeskTicketComments.metadata,
        createdAt: helpdeskTicketComments.createdAt,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(helpdeskTicketComments)
      .leftJoin(users, eq(helpdeskTicketComments.authorId, users.id))
      .where(
        and(
          eq(helpdeskTicketComments.orgId, session.orgId),
          eq(helpdeskTicketComments.ticketId, ticketId),
        ),
      )
      .orderBy(asc(helpdeskTicketComments.createdAt));

    const visible = canSeeInternal
      ? rows
      : rows.filter((r) => r.kind !== "internal_note");

    return ok(visible);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return withAuth(async (session) => {
    const { ticketId: ticketIdRaw } = await params;
    const ticketId = Number(ticketIdRaw);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return err("Invalid ticket id.", 400);
    }

    const ticket = await loadTicketForAccess(session.orgId, ticketId);
    if (!ticket) return err("Ticket not found.", 404);

    const isAdmin = isAdminOrOwner(session.user.role);
    const isAssignee = ticket.assigneeId === session.user.id;
    const isOwner = ticket.userId === session.user.id;

    if (!isAdmin && !isOwner && !isAssignee) {
      return err("Not authorized to comment on this ticket.", 403);
    }

    const data = await parseBody(req, createCommentSchema);
    const kind = data.kind ?? "comment";

    if (kind === "internal_note" && !isAdmin && !isAssignee) {
      return err("Only support staff can add internal notes.", 403);
    }

    const [comment] = await db
      .insert(helpdeskTicketComments)
      .values({
        orgId: session.orgId,
        ticketId,
        authorId: session.user.id,
        kind,
        body: data.body,
      })
      .returning();

    await db
      .update(helpdeskTickets)
      .set({ updatedAt: new Date() })
      .where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, session.orgId)));

    return ok({
      ...comment,
      authorName: session.user.name ?? null,
      authorImage: session.user.image ?? null,
    });
  });
}
