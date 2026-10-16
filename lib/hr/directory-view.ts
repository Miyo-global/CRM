import { isAdminOrOwner } from "@/lib/constants/roles";

/**
 * The fields a colleague may see about someone else.
 *
 * The employees endpoint returned a near-complete HR record — work email,
 * employee id, joining date and the whole reporting chain — to every
 * authenticated role (QA-0062). Admins still get the full row, and everyone
 * still gets their own.
 */
const DIRECTORY_FIELDS = [
  "id",
  "name",
  "firstName",
  "lastName",
  "image",
  "designation",
  "department",
  "departmentId",
  "isActive",
  "role",
] as const;

export function toDirectoryEntry<T extends { id: string }>(
  row: T,
  viewer: { id: string; role?: string | null },
): Partial<T> {
  if (isAdminOrOwner(viewer.role) || viewer.id === row.id) return row;

  const entry: Record<string, unknown> = {};
  for (const field of DIRECTORY_FIELDS) {
    if (field in row) entry[field] = (row as Record<string, unknown>)[field];
  }
  return entry as Partial<T>;
}
