export function parseTicketKey(raw: string, projectKey: string): number | null {
  const value = decodeURIComponent(raw).trim().toUpperCase();
  const match = /^(?:([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*)-)?(\d{1,9})$/.exec(value);
  if (!match) return null;
  if (match[1] && match[1] !== projectKey.toUpperCase()) return null;
  const n = Number(match[2]);
  return n > 0 ? n : null;
}
