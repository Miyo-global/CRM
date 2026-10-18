import type { NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { isKbAdmin, visiblePagesPredicate } from "@/lib/knowledge/authorization";

/**
 * KB-0052: the owners of pages this caller can see, for the owner filter.
 *
 * Names only. An employee filtering a list does not need the org's email
 * addresses, so the address is returned to admins alone.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const showEmails = isKbAdmin(ctx.actor);

    const rows = await db
      .selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(kbPages)
      .innerJoin(users, eq(users.id, kbPages.ownerUserId))
      .where(and(visiblePagesPredicate(ctx.actor), isNotNull(kbPages.ownerUserId)))
      .limit(200);

    return ok({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        ...(showEmails ? { email: row.email } : {}),
      })),
    });
  }, req);
}
