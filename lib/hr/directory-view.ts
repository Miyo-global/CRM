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

/**
 * What a people picker needs (R3-NET-01): `?fields=picker`. Built on the
 * directory card, so a colleague still never gets the work email; admins and
 * the viewer's own row keep it for the email-based pickers.
 */
const PICKER_FIELDS = ["id", "name", "firstName", "lastName", "image", "designation", "department", "email"] as const;

export function toPickerEntry<T extends { id: string }>(
  row: T,
  viewer: { id: string; role?: string | null },
): Partial<T> {
  const card = toDirectoryEntry(row, viewer) as Record<string, unknown>;
  const entry: Record<string, unknown> = {};
  for (const field of PICKER_FIELDS) {
    if (field in card) entry[field] = card[field];
  }
  return entry as Partial<T>;
}
