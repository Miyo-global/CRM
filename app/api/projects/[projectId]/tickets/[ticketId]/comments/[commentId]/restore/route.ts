import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments } from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { requireTicket } from "@/lib/projects/require-ticket";
import { canModifyComment, loadComment } from "@/lib/projects/comment-scope";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string; commentId: string }> };

export async function POST(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId, commentId } = await params;
    const guard = await requireTicket(session, rawProjectId, ticketId, "contribute");
    if (!guard.ok) return guard.response;
    const found = await loadComment(session.orgId, guard.ticket.id, commentId);
    if (!found.ok) return found.response;
    const { comment } = found;
    if (!canModifyComment(session.user, comment.userId)) return err("You can only restore your own comments", 403);
    if (!comment.deletedAt) return err("Comment is not deleted", 409);

    if (comment.parentCommentId) {
      const parent = await db.query.ticketComments.findFirst({
        where: and(eq(ticketComments.id, comment.parentCommentId), isNull(ticketComments.deletedAt)),
        columns: { id: true },
      });
      if (!parent) return err("Restore the comment this replied to first", 409);
    }

    await db
      .update(ticketComments)
      .set({ deletedAt: null })
      .where(
        and(
          or(eq(ticketComments.id, comment.id), eq(ticketComments.parentCommentId, comment.id)),
          eq(ticketComments.ticketId, guard.ticket.id),
          eq(ticketComments.deletedAt, comment.deletedAt),
        ),
      );

    return ok({ restored: true });
  });
}
