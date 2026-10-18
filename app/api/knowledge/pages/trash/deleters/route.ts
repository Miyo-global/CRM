import type { NextRequest } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, users } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";

/** KB-0044: who has pages in the trash, for the filter. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:manage", "kb:pages:purge");
    if (denied) return denied;

    const rows = await db
      .selectDistinct({
        id: kbPages.deletedById,
        name: users.name,
        pages: sql<number>`count(*) OVER (PARTITION BY ${kbPages.deletedById})::int`,
      })
      .from(kbPages)
      .leftJoin(users, eq(users.id, kbPages.deletedById))
      .where(
        and(
          eq(kbPages.orgId, session.orgId),
          isNotNull(kbPages.deletedAt),
          isNotNull(kbPages.deletedById),
        ),
      );

    return ok({ items: rows });
  }, req);
}
