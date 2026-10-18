import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0047: say out loud that a page is out of date.
 *
 * Anyone who can comment may do this: noticing that a runbook is wrong is not
 * a privilege, and the alternative is people reading something they have been
 * told elsewhere is stale.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "comment");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    await db
      .update(kbPages)
      .set({
        trustState: "verification_expired",
        verifiedUntil: new Date(),
        nextReviewAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

    await createAuditLog({
      action: "kb.page.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { markedStale: true },
    });

    return ok({ id, trustState: "verification_expired" });
  }, req);
}
