/**
 * KB-0028 (the pure half, needed by KB-0027): what a space seat lets you do.
 *
 * Streamline: kb_space_members.space_role.
 */
import { accessSatisfies, type KbPageAction } from "./access-levels";

export const KB_SPACE_ROLES = ["viewer", "commenter", "editor", "publisher", "admin"] as const;
export type KbSpaceRole = (typeof KB_SPACE_ROLES)[number];

const SPACE_ROLE_ACTION: Record<KbSpaceRole, KbPageAction> = {
  viewer: "view",
  commenter: "comment",
  editor: "edit",
  // A publisher edits, and may also publish and verify: both are edit-rank
  // actions plus a flag, not a higher rank.
  publisher: "edit",
  admin: "manage",
};

/** The page action a seat carries, or null when the seat is unknown. */
export function spaceRoleAction(role: string | null | undefined): KbPageAction | null {
  if (!role) return null;
  return SPACE_ROLE_ACTION[role as KbSpaceRole] ?? null;
}

/** Publishing and verifying need a publisher or a space admin, not just edit. */
export function spaceRoleCanPublish(role: string | null | undefined): boolean {
  return role === "publisher" || role === "admin";
}

export function spaceRoleSatisfies(
  role: string | null | undefined,
  required: KbPageAction,
): boolean {
  const held = spaceRoleAction(role);
  return held !== null && accessSatisfies(held, required);
}
