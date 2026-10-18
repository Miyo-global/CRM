import type { NextRequest } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { isKbAdmin } from "@/lib/knowledge/authorization";

/**
 * KB-0044: the trash.
 *
 * Deleted pages are not matched by visiblePagesPredicate (it filters them out
 * on purpose), so the scope here is explicit: an admin sees the org's trash,
 * everyone else sees what they deleted or created themselves.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const deletedBy = req.nextUrl.searchParams.get("deletedBy");

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        spaceId: kbPages.spaceId,
        deletedAt: kbPages.deletedAt,
        deletedById: kbPages.deletedById,
        deletedByName: users.name,
        legalHold: kbPages.legalHold,
      })
      .from(kbPages)
      .leftJoin(users, eq(users.id, kbPages.deletedById))
      .where(
        and(
          eq(kbPages.orgId, session.orgId),
          isNotNull(kbPages.deletedAt),
          ...(deletedBy ? [eq(kbPages.deletedById, deletedBy)] : []),
          ...(isKbAdmin(ctx.actor) ? [] : [eq(kbPages.deletedById, session.user.id)]),
        ),
      )
      .orderBy(desc(kbPages.deletedAt))
      .limit(100);

    return ok({ items: rows });
  }, req);
}
