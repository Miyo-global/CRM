/**
 * KB-0050, KB-0051: the page list behind every collection view.
 *
 * One query shape serves "all pages", "my pages", "shared with me", a space and
 * a project, because they differ only in their predicate. The cursor is keyset
 * rather than OFFSET: a wiki is browsed while people are editing it, and an
 * OFFSET page silently repeats or skips rows when something is inserted above.
 *
 * Streamline: SB/modules/kb/core/collection/knowledge-collection.service.ts,
 * kb-page-collection-cursor.ts, kb-page-text-query.ts.
 */
import "server-only";

export const KB_COLLECTION_SORTS = ["updated", "created", "title", "views"] as const;
export type KbCollectionSort = (typeof KB_COLLECTION_SORTS)[number];

export const KB_COLLECTION_SCOPES = ["all", "private", "shared", "space", "project"] as const;
export type KbCollectionScope = (typeof KB_COLLECTION_SCOPES)[number];

export const KB_PAGE_STATUSES = ["draft", "in_review", "published", "archived"] as const;

export const COLLECTION_LIMIT_DEFAULT = 50;
export const COLLECTION_LIMIT_MAX = 100;

/** A search box is not a query language: 8 terms, 200 characters. */
export const SEARCH_MAX_TERMS = 8;
export const SEARCH_MAX_CHARS = 200;

export interface CollectionCursor {
  /** The sort value of the last row, as text; the id breaks ties. */
  value: string;
  id: number;
}

export function encodeCursor(cursor: CollectionCursor): string {
  return Buffer.from(`${cursor.id}:${cursor.value}`, "utf-8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): CollectionCursor | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf-8");
    const split = decoded.indexOf(":");
    if (split <= 0) return null;
    const id = Number(decoded.slice(0, split));
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return { id, value: decoded.slice(split + 1) };
  } catch {
    return null;
  }
}

/** Trims a search box into something safe to hand Postgres. */
export function normalizeSearchTerms(raw: string | null | undefined): string {
  return (raw ?? "")
    .slice(0, SEARCH_MAX_CHARS)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEARCH_MAX_TERMS)
    .join(" ");
}

export function parseLimit(raw: string | null | undefined): number | { error: string } {
  if (raw === null || raw === undefined || raw === "") return COLLECTION_LIMIT_DEFAULT;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) return { error: "limit must be a whole number." };
  if (value > COLLECTION_LIMIT_MAX) {
    return { error: `limit must be ${COLLECTION_LIMIT_MAX} or fewer.` };
  }
  return value;
}
