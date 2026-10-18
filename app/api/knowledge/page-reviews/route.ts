import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, kbPageReviews, users } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";

/** KB-0060: the review queue, filterable by status, kind and reviewer. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:reviews:view", "kb:reviews:manage");
    if (denied) return denied;

    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const type = params.get("type");
    const reviewerId = params.get("reviewerId");

    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return err("Unknown status.", 400);
    }
    if (type && !["approval", "freshness"].includes(type)) return err("Unknown type.", 400);

    const rows = await db
      .select({
        id: kbPageReviews.id,
        pageId: kbPageReviews.pageId,
        pageTitle: kbPages.title,
        type: kbPageReviews.type,
        status: kbPageReviews.status,
        requestedById: kbPageReviews.requestedById,
        reviewerId: kbPageReviews.reviewerId,
        reviewerName: users.name,
        dueAt: kbPageReviews.dueAt,
        decidedAt: kbPageReviews.decidedAt,
        decisionNote: kbPageReviews.decisionNote,
        createdAt: kbPageReviews.createdAt,
      })
      .from(kbPageReviews)
      .innerJoin(
        kbPages,
        and(eq(kbPages.id, kbPageReviews.pageId), eq(kbPages.orgId, kbPageReviews.orgId)),
      )
      .leftJoin(users, eq(users.id, kbPageReviews.reviewerId))
      .where(
        and(
          eq(kbPageReviews.orgId, session.orgId),
          ...(status ? [eq(kbPageReviews.status, status as "pending")] : []),
          ...(type ? [eq(kbPageReviews.type, type as "approval")] : []),
          ...(reviewerId ? [eq(kbPageReviews.reviewerId, reviewerId)] : []),
        ),
      )
      .orderBy(asc(kbPageReviews.dueAt), asc(kbPageReviews.createdAt))
      .limit(100);

    return ok({ items: rows });
  }, req);
}
