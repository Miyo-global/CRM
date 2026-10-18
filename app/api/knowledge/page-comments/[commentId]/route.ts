import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageComments } from "@/lib/db/schema";
import { accessSatisfies } from "@/lib/knowledge/access-levels";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

const patchSchema = z.object({ content: z.string().trim().min(1).max(10_000) }).strict();

async function loadComment(orgId: string, commentId: number) {
  if (!Number.isSafeInteger(commentId) || commentId <= 0) return null;
  return (
    (await db.query.kbPageComments.findFirst({
      where: and(eq(kbPageComments.id, commentId), eq(kbPageComments.orgId, orgId)),
      columns: { id: true, pageId: true, authorId: true },
    })) ?? null
  );
}

/**
 * KB-0053: edit a comment.
 *
 * Only its author, since editing someone else's words is not a moderation
 * power anyone should have; a manager can delete but not rewrite.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const comment = await loadComment(session.orgId, Number(commentId));
    if (!comment) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, comment.pageId, "comment");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();
    if (comment.authorId !== session.user.id) {
      return err("Only the author can edit a comment.", 403);
    }

    try {
      const { content } = await parseBody(req, patchSchema);
      const [updated] = await db
        .update(kbPageComments)
        .set({ content, updatedAt: new Date() })
        .where(and(eq(kbPageComments.id, comment.id), eq(kbPageComments.orgId, session.orgId)))
        .returning();
      return ok(updated);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid comment.", 400);
      throw error;
    }
  }, req);
}

/** The author, or anyone who can manage the page, may delete. */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const comment = await loadComment(session.orgId, Number(commentId));
    if (!comment) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, comment.pageId, "comment");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const isAuthor = comment.authorId === session.user.id;
    const canManage = accessSatisfies(decision.scope.action, "manage");
    if (!isAuthor && !canManage) {
      return err("Only the author or a page manager can delete a comment.", 403);
    }

    await db
      .delete(kbPageComments)
      .where(and(eq(kbPageComments.id, comment.id), eq(kbPageComments.orgId, session.orgId)));

    return ok({ id: comment.id, deleted: true });
  }, req);
}
