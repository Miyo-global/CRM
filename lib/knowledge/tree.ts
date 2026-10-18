/**
 * KB-0030: walking the page tree.
 *
 * The walks are recursive CTEs with a depth cap. The cap is not decoration: a
 * cycle introduced by a bad move, or by two concurrent moves, would otherwise
 * make the query run until the connection dies.
 *
 * Streamline: SB/modules/kb/wiki/kb-page-tree.service.ts (WITH RECURSIVE
 * ancestors), kb-page-subtree.util.ts.
 */
import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";

/** Deep enough for any real wiki; shallow enough to stop a runaway walk. */
export const MAX_TREE_DEPTH = 50;

export interface KbBreadcrumb {
  id: number;
  title: string;
}

type Rows<T> = T[] | { rows?: T[] };

function rowsOf<T>(result: Rows<T>): T[] {
  return Array.isArray(result) ? result : (result.rows ?? []);
}

/** Nearest parent first; the root last. */
export async function getAncestors(orgId: string, pageId: number): Promise<KbBreadcrumb[]> {
  if (!Number.isSafeInteger(pageId) || pageId <= 0) return [];

  const result = await db.execute<{ id: number; title: string; depth: number }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT p.id, p.title, p.parent_page_id, 0 AS depth
      FROM kb_pages p
      WHERE p.id = ${pageId} AND p.org_id = ${orgId}
      UNION ALL
      SELECT parent.id, parent.title, parent.parent_page_id, a.depth + 1
      FROM kb_pages parent
      JOIN ancestors a ON a.parent_page_id = parent.id
      WHERE parent.org_id = ${orgId} AND a.depth < ${MAX_TREE_DEPTH}
    )
    SELECT id, title, depth FROM ancestors WHERE depth > 0 ORDER BY depth ASC
  `);

  return rowsOf(result).map((row) => ({ id: Number(row.id), title: row.title }));
}

/** Pure: the rule on its own, given the would-be parent's ancestry. */
export function cycleFromAncestry(
  pageId: number,
  newParentId: number | null,
  parentAncestorIds: readonly number[],
): boolean {
  if (newParentId === null) return false;
  if (newParentId === pageId) return true;
  return parentAncestorIds.includes(pageId);
}

/**
 * True when moving `pageId` under `newParentId` would make a loop — the parent
 * being the page itself, or the page being somewhere above the parent.
 */
export async function wouldCreateCycle(
  orgId: string,
  pageId: number,
  newParentId: number | null,
): Promise<boolean> {
  if (newParentId === null) return false;
  if (newParentId === pageId) return true;

  const ancestors = await getAncestors(orgId, newParentId);
  return cycleFromAncestry(
    pageId,
    newParentId,
    ancestors.map((a) => a.id),
  );
}

/** The page itself plus everything under it, for a move, a delete or a purge. */
export async function getSubtreeIds(orgId: string, pageId: number): Promise<number[]> {
  if (!Number.isSafeInteger(pageId) || pageId <= 0) return [];

  const result = await db.execute<{ id: number }>(sql`
    WITH RECURSIVE subtree AS (
      SELECT p.id, 0 AS depth
      FROM kb_pages p
      WHERE p.id = ${pageId} AND p.org_id = ${orgId}
      UNION ALL
      SELECT child.id, s.depth + 1
      FROM kb_pages child
      JOIN subtree s ON child.parent_page_id = s.id
      WHERE child.org_id = ${orgId} AND s.depth < ${MAX_TREE_DEPTH}
    )
    SELECT DISTINCT id FROM subtree
  `);

  return rowsOf(result).map((row) => Number(row.id));
}

/** Appends to the end of a level. Gaps are fine; order is all that matters. */
export async function nextSortOrder(orgId: string, parentPageId: number | null): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${kbPages.sortOrder})` })
    .from(kbPages)
    .where(
      and(
        eq(kbPages.orgId, orgId),
        parentPageId === null
          ? isNull(kbPages.parentPageId)
          : eq(kbPages.parentPageId, parentPageId),
        isNull(kbPages.deletedAt),
      ),
    );

  return (row?.max ?? -1) + 1;
}
