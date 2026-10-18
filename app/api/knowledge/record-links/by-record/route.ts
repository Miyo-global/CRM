import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageLinks, kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { visiblePagesPredicate } from "@/lib/knowledge/authorization";
import { isRecordLinkTarget } from "@/lib/knowledge/record-links";

/**
 * KB-0059: the pages linked to one record, for the panel on that record.
 *
 * Filtered by the caller's page visibility, so a private page linked to a deal
 * does not surface on the deal for the whole org.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const targetType = req.nextUrl.searchParams.get("targetType") ?? "";
    const targetId = req.nextUrl.searchParams.get("targetId") ?? "";
    if (!isRecordLinkTarget(targetType)) return err("Unknown targetType.", 400);
    if (!targetId) return err("targetId is required.", 400);

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        status: kbPages.status,
        label: kbPageLinks.label,
      })
      .from(kbPageLinks)
      .innerJoin(
        kbPages,
        and(eq(kbPages.id, kbPageLinks.sourcePageId), eq(kbPages.orgId, kbPageLinks.orgId)),
      )
      .where(
        and(
          eq(kbPageLinks.orgId, session.orgId),
          eq(kbPageLinks.targetType, targetType),
          eq(kbPageLinks.targetId, targetId),
          visiblePagesPredicate(ctx.actor),
        ),
      )
      .limit(100);

    return ok({ items: rows });
  }, req);
}
