/**
 * KB-0035: space queries.
 *
 * The slug is derived from the name and made unique per org, so a space is
 * addressable by a readable URL without the caller having to invent one.
 */
import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPages, kbSpaceMembers, kbSpaces } from "@/lib/db/schema";
import { slugify } from "@/lib/ats/slug";

import { isKbAdmin, type KbActor } from "./authorization";

export interface KbSpaceListItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  audience: string;
  icon: string | null;
  color: string | null;
  defaultVisibility: string;
  archivedAt: Date | null;
  memberCount: number;
  pageCount: number;
  mySpaceRole: string | null;
}

/** Unique per org among live spaces; counts up on a clash. */
export async function uniqueSpaceSlug(orgId: string, name: string): Promise<string> {
  const base = slugify(name) || "space";
  const taken = await db
    .select({ slug: kbSpaces.slug })
    .from(kbSpaces)
    .where(and(eq(kbSpaces.orgId, orgId), isNull(kbSpaces.deletedAt)));

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Spaces this actor can see: an admin sees all, anyone else sees the ones that
 * are not private plus the private ones they hold a seat in. Member and page
 * counts come from subqueries rather than a join, so a space with many pages
 * does not multiply the rows.
 */
export async function listVisibleSpaces(actor: KbActor): Promise<KbSpaceListItem[]> {
  const memberCount = sql<number>`(
    SELECT count(*)::int FROM ${kbSpaceMembers}
    WHERE ${kbSpaceMembers.spaceId} = ${kbSpaces.id} AND ${kbSpaceMembers.orgId} = ${kbSpaces.orgId}
  )`;
  const pageCount = sql<number>`(
    SELECT count(*)::int FROM ${kbPages}
    WHERE ${kbPages.spaceId} = ${kbSpaces.id}
      AND ${kbPages.orgId} = ${kbSpaces.orgId}
      AND ${kbPages.deletedAt} IS NULL
  )`;
  const mySpaceRole = sql<string | null>`(
    SELECT m.space_role FROM ${kbSpaceMembers} m
    WHERE m.space_id = ${kbSpaces.id}
      AND m.org_id = ${kbSpaces.orgId}
      AND (m.user_id = ${actor.userId} OR m.role = ${actor.role ?? ""})
    ORDER BY CASE m.space_role
      WHEN 'admin' THEN 5 WHEN 'publisher' THEN 4 WHEN 'editor' THEN 3
      WHEN 'commenter' THEN 2 ELSE 1 END DESC
    LIMIT 1
  )`;

  const rows = await db
    .select({
      id: kbSpaces.id,
      name: kbSpaces.name,
      slug: kbSpaces.slug,
      description: kbSpaces.description,
      type: kbSpaces.type,
      audience: kbSpaces.audience,
      icon: kbSpaces.icon,
      color: kbSpaces.color,
      defaultVisibility: kbSpaces.defaultVisibility,
      archivedAt: kbSpaces.archivedAt,
      memberCount,
      pageCount,
      mySpaceRole,
    })
    .from(kbSpaces)
    .where(and(eq(kbSpaces.orgId, actor.orgId), isNull(kbSpaces.deletedAt)))
    .orderBy(kbSpaces.name);

  if (isKbAdmin(actor)) return rows;

  // Someone else's private space is not theirs to know about.
  return rows.filter((row) => row.type !== "private" || row.mySpaceRole !== null);
}

export async function countSpacePages(orgId: string, spaceId: number) {
  const [row] = await db
    .select({
      pages: count(),
      published: sql<number>`count(*) FILTER (WHERE ${kbPages.status} = 'published')::int`,
      publicLinks: sql<number>`count(*) FILTER (WHERE ${kbPages.publicTokenHash} IS NOT NULL)::int`,
    })
    .from(kbPages)
    .where(
      and(eq(kbPages.orgId, orgId), eq(kbPages.spaceId, spaceId), isNull(kbPages.deletedAt)),
    );
  return {
    pages: Number(row?.pages ?? 0),
    published: Number(row?.published ?? 0),
    publicLinks: Number(row?.publicLinks ?? 0),
  };
}

/** Bumped whenever space access changes, so indexed chunk ACLs can be told stale. */
export async function bumpSpaceAclRevision(orgId: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO kb_space_acl_versions (org_id, revision) VALUES (${orgId}, 1)
    ON CONFLICT (org_id) DO UPDATE SET revision = kb_space_acl_versions.revision + 1
  `);
}
