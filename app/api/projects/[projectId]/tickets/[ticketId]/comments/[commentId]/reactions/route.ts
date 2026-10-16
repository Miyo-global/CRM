import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketCommentReactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireTicket } from "@/lib/projects/require-ticket";
import { loadComment } from "@/lib/projects/comment-scope";

const emojiSchema = z.string().trim().min(1).max(16).regex(/^[^\s<>]+$/, "Not a valid reaction");
const reactionSchema = z.object({ emoji: emojiSchema }).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string; commentId: string }> };

async function liveComment(session: { user: { id: string; role?: string | null }; orgId: string }, raw: Awaited<RouteParams["params"]>) {
  const guard = await requireTicket(session, raw.projectId, raw.ticketId, "contribute");
  if (!guard.ok) return guard;
  const found = await loadComment(session.orgId, guard.ticket.id, raw.commentId);
  if (!found.ok) return found;
  if (found.comment.deletedAt) return { ok: false as const, response: err("Comment not found", 404) };
  return found;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const found = await liveComment(session, await params);
    if (!found.ok) return found.response;
    const { emoji } = await parseBody(req, reactionSchema);

    await db
      .insert(ticketCommentReactions)
      .values({ orgId: session.orgId, commentId: found.comment.id, userId: session.user.id, emoji })
      .onConflictDoNothing();
    return ok({ commentId: found.comment.id, userId: session.user.id, emoji }, 201);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const found = await liveComment(session, await params);
    if (!found.ok) return found.response;
    const emoji = emojiSchema.parse(req.nextUrl.searchParams.get("emoji") ?? "");

    await db
      .delete(ticketCommentReactions)
      .where(
        and(
          eq(ticketCommentReactions.commentId, found.comment.id),
          eq(ticketCommentReactions.userId, session.user.id),
          eq(ticketCommentReactions.emoji, emoji),
        ),
      );
    return ok({ success: true });
  });
}
