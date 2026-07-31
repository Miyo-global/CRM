import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { z } from "zod";

const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string; commentId: string }>;
};

function canModifyComment(
  sessionUserId: string,
  sessionRole: string | undefined | null,
  commentUserId: string
): boolean {
  if (commentUserId === sessionUserId) return true;
  return isAdminOrOwner(sessionRole);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid, commentId: cid } = await params;
    const projectId = Number(pid);
    const ticketId = Number(tid);
    const commentId = Number(cid);
    if (!ticketId || !commentId || !projectId) {
      return err("Invalid project, ticket, or comment id", 400);
    }

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.orgId, session.orgId!),
        eq(tickets.projectId, projectId)
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const comment = await db.query.ticketComments.findFirst({
      where: and(
        eq(ticketComments.id, commentId),
        eq(ticketComments.ticketId, ticketId),
        eq(ticketComments.orgId, session.orgId!)
      ),
    });
    if (!comment) return err("Comment not found", 404);

    if (!canModifyComment(session.user.id, session.user.role, comment.userId)) {
      return err("You can only edit your own comments", 403);
    }

    const body = await parseBody(req, updateCommentSchema);

    const [updated] = await db
      .update(ticketComments)
      .set({
        content: body.content,
        updatedAt: new Date(),
      })
      .where(eq(ticketComments.id, commentId))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid, commentId: cid } = await params;
    const projectId = Number(pid);
    const ticketId = Number(tid);
    const commentId = Number(cid);
    if (!ticketId || !commentId || !projectId) {
      return err("Invalid project, ticket, or comment id", 400);
    }

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.orgId, session.orgId!),
        eq(tickets.projectId, projectId)
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const comment = await db.query.ticketComments.findFirst({
      where: and(
        eq(ticketComments.id, commentId),
        eq(ticketComments.ticketId, ticketId),
        eq(ticketComments.orgId, session.orgId!)
      ),
    });
    if (!comment) return err("Comment not found", 404);

    if (!canModifyComment(session.user.id, session.user.role, comment.userId)) {
      return err("You can only delete your own comments", 403);
    }

    await db.delete(ticketComments).where(eq(ticketComments.id, commentId));

    return ok({ success: true });
  });
}
