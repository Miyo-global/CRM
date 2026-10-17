/**
 * MIYO-0644: the pure half of duplicate detection, so it can be tested
 * without a database. lib/ats/duplicates.ts runs the query.
 */

/** LinkedIn URLs differ by scheme, www and a trailing slash; this is the handle. */
export function linkedinHandle(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /linkedin\.com\/(?:in|pub)\/([^/?#]+)/i.exec(url.trim());
  return match ? match[1].toLowerCase() : null;
}
