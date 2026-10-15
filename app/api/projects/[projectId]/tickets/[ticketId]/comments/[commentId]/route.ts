import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { requireTicket } from "@/lib/projects/require-ticket";
import { canModifyComment, loadComment } from "@/lib/projects/comment-scope";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";
import { syncCommentMentions } from "@/lib/projects/comment-effects";

const updateCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(20000),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string; commentId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId, commentId } = await params;
    const guard = await requireTicket(session, rawProjectId, ticketId, "contribute");
    if (!guard.ok) return guard.response;
    const found = await loadComment(session.orgId, guard.ticket.id, commentId);
    if (!found.ok) return found.response;
    const { comment } = found;
    if (comment.deletedAt) return err("Comment not found", 404);
    if (!canModifyComment(session.user, comment.userId)) return err("You can only edit your own comments", 403);

    const body = await parseBody(req, updateCommentSchema);
    const [updated] = await db
      .update(ticketComments)
      .set({ content: body.content, updatedAt: new Date() })
      .where(eq(ticketComments.id, comment.id))
      .returning();

    await recordTicketActivity(
      { orgId: session.orgId, projectId: guard.projectId, ticketId: guard.ticket.id, actorId: session.user.id },
      [{ action: "comment_updated", field: null, fromValue: null, toValue: null }],
    );
    await syncCommentMentions(
      {
        orgId: session.orgId,
        projectId: guard.projectId,
        ticketId: guard.ticket.id,
        ticketTitle: guard.ticket.title,
        commentId: comment.id,
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? "A team member",
      },
      body.content,
    );

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId, commentId } = await params;
    const guard = await requireTicket(session, rawProjectId, ticketId, "contribute");
    if (!guard.ok) return guard.response;
    const found = await loadComment(session.orgId, guard.ticket.id, commentId);
    if (!found.ok) return found.response;
    const { comment } = found;
    if (comment.deletedAt) return err("Comment not found", 404);
    if (!canModifyComment(session.user, comment.userId)) return err("You can only delete your own comments", 403);

    await db
      .update(ticketComments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          or(eq(ticketComments.id, comment.id), eq(ticketComments.parentCommentId, comment.id)),
          eq(ticketComments.ticketId, guard.ticket.id),
          isNull(ticketComments.deletedAt),
        ),
      );

    await recordTicketActivity(
      { orgId: session.orgId, projectId: guard.projectId, ticketId: guard.ticket.id, actorId: session.user.id },
      [{ action: "comment_deleted", field: null, fromValue: null, toValue: null }],
    );

    return ok({ success: true });
  });
}
