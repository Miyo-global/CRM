import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageComments } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0053: mark a thread settled, or re-open it. Toggles, because the two are
 * the same decision made twice and a second endpoint would drift.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(commentId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const comment = await db.query.kbPageComments.findFirst({
      where: and(eq(kbPageComments.id, id), eq(kbPageComments.orgId, session.orgId)),
      columns: { id: true, pageId: true, resolvedAt: true },
    });
    if (!comment) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, comment.pageId, "comment");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const resolvedAt = comment.resolvedAt ? null : new Date();
    await db
      .update(kbPageComments)
      .set({ resolvedAt, updatedAt: new Date() })
      .where(and(eq(kbPageComments.id, id), eq(kbPageComments.orgId, session.orgId)));

    return ok({ id, resolvedAt });
  }, req);
}
