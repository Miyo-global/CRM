import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, kbPageVisits } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { visiblePagesPredicate } from "@/lib/knowledge/authorization";

/**
 * KB-0040: the last 20 pages this person opened.
 *
 * kb_page_visits holds one row per reader per page, so "recent" is an ORDER BY
 * rather than a group-by over a log. The visibility predicate is applied again
 * here: access can be revoked after a visit.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        spaceId: kbPages.spaceId,
        visitedAt: kbPageVisits.visitedAt,
      })
      .from(kbPageVisits)
      .innerJoin(
        kbPages,
        and(eq(kbPages.id, kbPageVisits.pageId), eq(kbPages.orgId, kbPageVisits.orgId)),
      )
      .where(
        and(
          eq(kbPageVisits.orgId, session.orgId),
          eq(kbPageVisits.userId, session.user.id),
          visiblePagesPredicate(ctx.actor),
        ),
      )
      .orderBy(desc(kbPageVisits.visitedAt))
      .limit(20);

    return ok({ items: rows });
  }, req);
}
