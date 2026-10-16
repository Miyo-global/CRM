export function parseTicketKey(raw: string, projectKey: string): number | null {
  const value = decodeURIComponent(raw).trim().toUpperCase();
  const match = /^(?:([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)-)?(\d{1,9})$/.exec(value);
  if (!match) return null;
  if (match[1] && match[1] !== projectKey.toUpperCase()) return null;
  const n = Number(match[2]);
  return n > 0 ? n : null;
}

/**
 * A ticket's public id, "QUP-2".
 *
 * Lists showed "#2" while the ticket page and search used the project-scoped
 * key, so the same ticket had two names (QA-D011). Without a project key
 * there is nothing to scope with, so the number stands alone.
 */
export function ticketKey(
  projectKey: string | null | undefined,
  ticketNumber: string | number | null | undefined,
): string {
  const number = ticketNumber == null ? "" : String(ticketNumber);
  if (!number) return "";
  const key = projectKey?.trim();
  return key ? `${key}-${number}` : `#${number}`;
}
