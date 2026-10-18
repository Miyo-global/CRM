import type { NextRequest } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { visiblePagesPredicate } from "@/lib/knowledge/authorization";

/**
 * KB-0040: a flat list the client assembles into a tree.
 *
 * Flat rather than nested because the sidebar renders lazily and a nested
 * payload would have to be re-sent whenever one branch opens. Capped at 500
 * nodes; `hasChildren` is what lets the client fetch the rest a branch at a
 * time.
 */
export const TREE_NODE_CAP = 500;

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const spaceId = Number(req.nextUrl.searchParams.get("spaceId"));
    const projectId = Number(req.nextUrl.searchParams.get("projectId"));

    const scope = Number.isSafeInteger(spaceId) && spaceId > 0
      ? eq(kbPages.spaceId, spaceId)
      : Number.isSafeInteger(projectId) && projectId > 0
        ? eq(kbPages.projectId, projectId)
        : undefined;

    const hasChildren = sql<boolean>`EXISTS (
      SELECT 1 FROM kb_pages child
      WHERE child.parent_page_id = ${kbPages.id}
        AND child.org_id = ${kbPages.orgId}
        AND child.deleted_at IS NULL
    )`;

    const rows = await db
      .select({
        id: kbPages.id,
        parentPageId: kbPages.parentPageId,
        title: kbPages.title,
        icon: kbPages.icon,
        sortOrder: kbPages.sortOrder,
        status: kbPages.status,
        hasChildren,
      })
      .from(kbPages)
      .where(scope ? and(visiblePagesPredicate(ctx.actor), scope) : visiblePagesPredicate(ctx.actor))
      .orderBy(asc(kbPages.sortOrder), asc(kbPages.title))
      .limit(TREE_NODE_CAP + 1);

    return ok({
      nodes: rows.slice(0, TREE_NODE_CAP),
      truncated: rows.length > TREE_NODE_CAP,
    });
  }, req);
}
