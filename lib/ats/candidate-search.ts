/**
 * MIYO-0643: the parts of candidate search that do not need a database.
 * The route builds the query; these decide what the query means.
 */

/** A search with no words in it should list, not search. */
export function hasSearchTerms(query: string | null | undefined): boolean {
  return Boolean(query && query.trim().length > 0);
}

/**
 * websearch_to_tsquery takes quotes, OR and -word as written, so the term
 * goes in whole. For the ILIKE fallback the wildcards have to be escaped, or
 * a candidate typing "100%" matches everyone.
 */
export function ilikePattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
