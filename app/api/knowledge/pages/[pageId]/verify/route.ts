import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { verifiedUntil } from "@/lib/knowledge/page-status";

/**
 * KB-0047: mark a page as checked.
 *
 * Verification is a window, not a flag: verified_until is set from the page's
 * own review interval or the 180-day default, and the content-health scan turns
 * it into verification_expired once it lapses.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, reviewIntervalDays: true },
    });
    if (!page) return kbNotFound();

    const now = new Date();
    const until = verifiedUntil(now, page.reviewIntervalDays);

    await db
      .update(kbPages)
      .set({
        trustState: "verified",
        verifiedById: session.user.id,
        verifiedAt: now,
        verifiedUntil: until,
        nextReviewAt: until,
        updatedAt: now,
      })
      .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

    await createAuditLog({
      action: "kb.page.verified",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { verifiedUntil: until.toISOString() },
    });

    return ok({ id, trustState: "verified", verifiedAt: now, verifiedUntil: until });
  }, req);
}
