import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageLinks, kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess, visiblePagesPredicate } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0045: what links here.
 *
 * The linking pages are filtered by the caller's own visibility, not the
 * target's: someone's private page linking to the handbook must not show up in
 * the handbook's backlinks for the whole org.
 */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        spaceId: kbPages.spaceId,
        label: kbPageLinks.label,
      })
      .from(kbPageLinks)
      .innerJoin(
        kbPages,
        and(
          eq(kbPages.id, kbPageLinks.sourcePageId),
          eq(kbPages.orgId, kbPageLinks.orgId),
        ),
      )
      .where(
        and(
          eq(kbPageLinks.orgId, session.orgId),
          eq(kbPageLinks.targetPageId, id),
          visiblePagesPredicate(ctx.actor),
        ),
      )
      .limit(100);

    return ok({ items: rows });
  }, req);
}
