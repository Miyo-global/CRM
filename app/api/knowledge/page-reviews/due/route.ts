import type { NextRequest } from "next/server";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, kbPageReviews } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";

/**
 * KB-0060: reviews that are due.
 *
 * Scoped to the caller unless they manage reviews: "what is due" is normally a
 * personal question, and the whole org's queue is the manage view.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const canSeeAll = (ctx.actor.permissions ?? []).includes("kb:reviews:manage");

    const rows = await db
      .select({
        id: kbPageReviews.id,
        pageId: kbPageReviews.pageId,
        pageTitle: kbPages.title,
        type: kbPageReviews.type,
        dueAt: kbPageReviews.dueAt,
        reviewerId: kbPageReviews.reviewerId,
      })
      .from(kbPageReviews)
      .innerJoin(
        kbPages,
        and(eq(kbPages.id, kbPageReviews.pageId), eq(kbPages.orgId, kbPageReviews.orgId)),
      )
      .where(
        and(
          eq(kbPageReviews.orgId, session.orgId),
          eq(kbPageReviews.status, "pending"),
          isNotNull(kbPageReviews.dueAt),
          lte(kbPageReviews.dueAt, new Date()),
          ...(canSeeAll ? [] : [eq(kbPageReviews.reviewerId, session.user.id)]),
        ),
      )
      .orderBy(asc(kbPageReviews.dueAt))
      .limit(100);

    return ok({ items: rows });
  }, req);
}
