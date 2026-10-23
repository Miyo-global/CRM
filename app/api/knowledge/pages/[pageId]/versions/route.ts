import type { NextRequest } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageVersions, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

const VERSION_PAGE_SIZE = 50;
const VERSION_PAGE_SIZE_CAP = 100;

/**
 * KB-0046: the history list.
 *
 * Keyset paging on version_number, which is dense and descending, so a long
 * history pages without an OFFSET scan. The content is left out of the list —
 * a page of 50 full Plate documents is a megabyte nobody asked for.
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

    const requested = Number(req.nextUrl.searchParams.get("limit") ?? VERSION_PAGE_SIZE);
    if (Number.isFinite(requested) && requested > VERSION_PAGE_SIZE_CAP) {
      return err(`limit must be ${VERSION_PAGE_SIZE_CAP} or fewer.`, 400);
    }
    const limit = Number.isFinite(requested) && requested > 0 ? requested : VERSION_PAGE_SIZE;

    const before = Number(req.nextUrl.searchParams.get("before"));
    const cursor = Number.isSafeInteger(before) && before > 0 ? before : null;

    const rows = await db
      .select({
        versionNumber: kbPageVersions.versionNumber,
        title: kbPageVersions.title,
        changeSummary: kbPageVersions.changeSummary,
        authorId: kbPageVersions.authorId,
        authorName: users.name,
        createdAt: kbPageVersions.createdAt,
      })
      .from(kbPageVersions)
      .leftJoin(users, eq(users.id, kbPageVersions.authorId))
      .where(
        and(
          eq(kbPageVersions.orgId, session.orgId),
          eq(kbPageVersions.pageId, id),
          ...(cursor ? [lt(kbPageVersions.versionNumber, cursor)] : []),
        ),
      )
      .orderBy(desc(kbPageVersions.versionNumber))
      .limit(limit);

    return ok({
      items: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].versionNumber : null,
    });
  }, req);
}
