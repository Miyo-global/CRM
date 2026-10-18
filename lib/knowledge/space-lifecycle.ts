/**
 * KB-0036: archiving a space.
 *
 * Archive is not delete: the pages stay readable and stop being editable, and
 * the public links go. The impact preview exists because "archive this space"
 * is a decision about other people's work — the count of published pages and
 * live share links is the part worth seeing first.
 */
import "server-only";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbLinkedDocuments, kbPages, kbSpaces } from "@/lib/db/schema";

import { bumpSpaceAclRevision } from "./spaces";

export interface SpaceArchiveImpact {
  pages: number;
  published: number;
  publicLinks: number;
  linkedDocuments: number;
}

export async function spaceArchiveImpact(
  orgId: string,
  spaceId: number,
): Promise<SpaceArchiveImpact> {
  const [pageRow] = await db
    .select({
      pages: sql<number>`count(*)::int`,
      published: sql<number>`count(*) FILTER (WHERE ${kbPages.status} = 'published')::int`,
      publicLinks: sql<number>`count(*) FILTER (WHERE ${kbPages.publicTokenHash} IS NOT NULL)::int`,
    })
    .from(kbPages)
    .where(and(eq(kbPages.orgId, orgId), eq(kbPages.spaceId, spaceId), isNull(kbPages.deletedAt)));

  const [docRow] = await db
    .select({ linkedDocuments: sql<number>`count(*)::int` })
    .from(kbLinkedDocuments)
    .where(
      and(
        eq(kbLinkedDocuments.orgId, orgId),
        eq(kbLinkedDocuments.spaceId, spaceId),
        eq(kbLinkedDocuments.status, "active"),
      ),
    );

  return {
    pages: Number(pageRow?.pages ?? 0),
    published: Number(pageRow?.published ?? 0),
    publicLinks: Number(pageRow?.publicLinks ?? 0),
    linkedDocuments: Number(docRow?.linkedDocuments ?? 0),
  };
}

/**
 * Archiving revokes the share links of the space's pages. A link that outlives
 * the decision to retire its space is exactly the leak archive is meant to
 * close, so the token hash is cleared and the revision bumped (an old URL then
 * resolves to nothing).
 */
export async function archiveSpace(orgId: string, spaceId: number): Promise<void> {
  await db
    .update(kbSpaces)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(kbSpaces.orgId, orgId), eq(kbSpaces.id, spaceId)));

  await db
    .update(kbPages)
    .set({
      publicToken: null,
      publicTokenHash: null,
      publicTokenRevision: sql`${kbPages.publicTokenRevision} + 1`,
      aclRevision: sql`${kbPages.aclRevision} + 1`,
      aclRevisionChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(kbPages.orgId, orgId),
        eq(kbPages.spaceId, spaceId),
        isNotNull(kbPages.publicTokenHash),
      ),
    );

  await bumpSpaceAclRevision(orgId);
}

export async function restoreSpace(orgId: string, spaceId: number): Promise<void> {
  await db
    .update(kbSpaces)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(kbSpaces.orgId, orgId), eq(kbSpaces.id, spaceId)));
  await bumpSpaceAclRevision(orgId);
}

/** True while the page's space is archived, which makes the page read-only. */
export async function isPageSpaceArchived(
  orgId: string,
  spaceId: number | null,
): Promise<boolean> {
  if (spaceId === null) return false;
  const space = await db.query.kbSpaces.findFirst({
    where: and(eq(kbSpaces.orgId, orgId), eq(kbSpaces.id, spaceId)),
    columns: { archivedAt: true },
  });
  return !!space?.archivedAt;
}
