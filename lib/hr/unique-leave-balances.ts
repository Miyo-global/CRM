/**
 * One balance row per leave type (R3-PRJ-08). leave_balances has no unique
 * key, so racing seeders left a second, untouched "12 of 12" row next to the
 * real one. The oldest row (lowest id) is the one approvals deduct from.
 * ponytail: read-side dedupe; add a unique (user_id, leave_type_id, year)
 * index once the duplicate rows are cleaned up in the database.
 */
export function uniqueLeaveBalances<T extends { id: number; leaveTypeId: number | null }>(rows: T[]): T[] {
  const byType = new Map<number | null, T>();
  for (const row of [...rows].sort((a, b) => a.id - b.id)) {
    if (!byType.has(row.leaveTypeId)) byType.set(row.leaveTypeId, row);
  }
  return [...byType.values()];
}
