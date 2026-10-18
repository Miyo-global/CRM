/**
 * KB-0042, KB-0043: duplicating and trashing a subtree.
 *
 * Both work on the subtree rather than the single page, because a page's
 * children are part of it as far as a reader is concerned: deleting a parent
 * and leaving its children orphaned in the tree is the bug this avoids.
 */
import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";

import { buildExcerpt, extractContentText } from "./content";
import { getSubtreeIds, nextSortOrder } from "./tree";

export interface DuplicateResult {
  rootId: number;
  created: number;
}

/**
 * Copies a page, and optionally everything under it, as drafts owned by the
 * caller. The copy is a draft on purpose: a duplicate of a published policy
 * that is itself published immediately is two live policies.
 */
export async function duplicatePage(
  orgId: string,
  pageId: number,
  actorId: string,
  includeChildren: boolean,
): Promise<DuplicateResult | null> {
  const ids = includeChildren ? await getSubtreeIds(orgId, pageId) : [pageId];
  if (ids.length === 0) return null;

  const rows = await db
    .select({
      id: kbPages.id,
      parentPageId: kbPages.parentPageId,
      spaceId: kbPages.spaceId,
      projectId: kbPages.projectId,
      title: kbPages.title,
      icon: kbPages.icon,
      coverImage: kbPages.coverImage,
      content: kbPages.content,
      contentType: kbPages.contentType,
      visibility: kbPages.visibility,
      sortOrder: kbPages.sortOrder,
    })
    .from(kbPages)
    .where(and(eq(kbPages.orgId, orgId), inArray(kbPages.id, ids), isNull(kbPages.deletedAt)));

  const root = rows.find((row) => row.id === pageId);
  if (!root) return null;

  const idMap = new Map<number, number>();
  // Parents before children, so a child's new parent id already exists.
  const ordered = [root, ...rows.filter((row) => row.id !== pageId)];

  for (const row of ordered) {
    const isRoot = row.id === pageId;
    const contentText = row.content ? extractContentText(row.content) : null;

    const [created] = await db
      .insert(kbPages)
      .values({
        orgId,
        spaceId: row.spaceId,
        projectId: row.projectId,
        parentPageId: isRoot
          ? root.parentPageId
          : (idMap.get(row.parentPageId ?? -1) ?? root.parentPageId),
        title: isRoot ? `Copy of ${row.title}`.slice(0, 500) : row.title,
        icon: row.icon,
        coverImage: row.coverImage,
        content: row.content as never,
        contentText,
        excerpt: contentText ? buildExcerpt(contentText) : null,
        contentType: row.contentType,
        // A copy starts private-to-the-space default and as a draft.
        visibility: row.visibility,
        status: "draft",
        createdById: actorId,
        lastEditedById: actorId,
        ownerUserId: actorId,
        sortOrder: isRoot ? await nextSortOrder(orgId, root.parentPageId) : row.sortOrder,
      })
      .returning({ id: kbPages.id });

    idMap.set(row.id, created.id);
  }

  return { rootId: idMap.get(pageId)!, created: idMap.size };
}

/** Soft-deletes the page and everything under it. Returns the ids affected. */
export async function trashSubtree(
  orgId: string,
  pageId: number,
  actorId: string,
): Promise<number[]> {
  const ids = await getSubtreeIds(orgId, pageId);
  if (ids.length === 0) return [];

  await db
    .update(kbPages)
    .set({
      deletedAt: new Date(),
      deletedById: actorId,
      // A share link must not outlive the page it points at.
      publicToken: null,
      publicTokenHash: null,
      publicTokenRevision: sql`${kbPages.publicTokenRevision} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(kbPages.orgId, orgId), inArray(kbPages.id, ids), isNull(kbPages.deletedAt)));

  return ids;
}

/**
 * Brings a trashed subtree back. A page whose parent is still in the trash
 * is re-parented to the root, since the alternative is a page that exists but
 * cannot be reached.
 */
export async function restoreSubtree(
  orgId: string,
  pageId: number,
  actorId: string,
): Promise<{ restored: number[]; reparented: number[] }> {
  const root = await db.query.kbPages.findFirst({
    where: and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)),
    columns: { id: true, parentPageId: true, deletedAt: true },
  });
  if (!root || !root.deletedAt) return { restored: [], reparented: [] };

  // The subtree walk ignores deleted_at, so the children come back too.
  const ids = await getSubtreeIds(orgId, pageId);

  const reparented: number[] = [];
  if (root.parentPageId !== null) {
    const parent = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, root.parentPageId), eq(kbPages.orgId, orgId)),
      columns: { id: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt) {
      await db
        .update(kbPages)
        .set({ parentPageId: null, updatedAt: new Date() })
        .where(and(eq(kbPages.id, pageId), eq(kbPages.orgId, orgId)));
      reparented.push(pageId);
    }
  }

  await db
    .update(kbPages)
    .set({ deletedAt: null, deletedById: null, lastEditedById: actorId, updatedAt: new Date() })
    .where(and(eq(kbPages.orgId, orgId), inArray(kbPages.id, ids)));

  return { restored: ids, reparented };
}
