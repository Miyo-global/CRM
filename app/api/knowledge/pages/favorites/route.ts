import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageFavorites, kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { visiblePagesPredicate } from "@/lib/knowledge/authorization";

/** KB-0040: the caller's favourites, in their own order. */
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
        sortOrder: kbPageFavorites.sortOrder,
      })
      .from(kbPageFavorites)
      .innerJoin(
        kbPages,
        and(eq(kbPages.id, kbPageFavorites.pageId), eq(kbPages.orgId, kbPageFavorites.orgId)),
      )
      .where(
        and(
          eq(kbPageFavorites.orgId, session.orgId),
          eq(kbPageFavorites.userId, session.user.id),
          visiblePagesPredicate(ctx.actor),
        ),
      )
      .orderBy(asc(kbPageFavorites.sortOrder), asc(kbPageFavorites.createdAt))
      .limit(100);

    return ok({ items: rows });
  }, req);
}
