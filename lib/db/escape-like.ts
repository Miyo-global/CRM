/**
 * % and _ are wildcards in LIKE/ILIKE: a search for "100%" must match the
 * literal text (MIYO-0081/0082). Postgres's default LIKE escape is backslash,
 * so escaping with it needs no ESCAPE clause.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** "%<escaped>%" for a contains-search. */
export function likePattern(value: string): string {
  return `%${escapeLike(value)}%`;
}
