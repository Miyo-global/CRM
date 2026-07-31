export function hasWorkLogContent(
  rows: { hours: string | null; description: string | null }[],
): boolean {
  return rows.some(
    (r) => (Number(r.hours) || 0) > 0 || (r.description?.trim().length ?? 0) > 0,
  );
}
