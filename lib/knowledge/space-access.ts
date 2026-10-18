/**
 * KB-0028: what a space seat lets you do, and where a person's own pages live.
 *
 * Streamline: kb_space_members.space_role, kb_spaces.type='private',
 * SF/features/wiki/components/private-page.tsx.
 */
import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbSpaceMembers, kbSpaces } from "@/lib/db/schema";

import { accessSatisfies, type KbPageAction } from "./access-levels";
import type { KbActor } from "./authorization";

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

/**
 * The seat this actor holds in a space: their own row, or one that grants by
 * their org role. The strongest wins, since a person can match both.
 */
export async function resolveSpaceRole(
  actor: KbActor,
  spaceId: number,
): Promise<KbSpaceRole | null> {
  if (!Number.isSafeInteger(spaceId) || spaceId <= 0) return null;

  const seats = await db.query.kbSpaceMembers.findMany({
    where: and(
      eq(kbSpaceMembers.orgId, actor.orgId),
      eq(kbSpaceMembers.spaceId, spaceId),
      actor.role
        ? or(eq(kbSpaceMembers.userId, actor.userId), eq(kbSpaceMembers.role, actor.role))
        : eq(kbSpaceMembers.userId, actor.userId),
    ),
    columns: { spaceRole: true },
  });

  let best: KbSpaceRole | null = null;
  for (const seat of seats) {
    const role = seat.spaceRole as KbSpaceRole;
    const action = spaceRoleAction(role);
    if (!action) continue;
    const bestAction = best ? spaceRoleAction(best) : null;
    if (!bestAction || accessSatisfies(action, bestAction)) best = role;
  }
  return best;
}

/** Slug of a person's own space. Stable, so the lookup needs no extra column. */
export function privateSpaceSlug(userId: string): string {
  return `private-${userId}`;
}

/**
 * "My pages": every employee gets one private space, made on first visit
 * rather than at signup, so an org that never opens the wiki grows no rows
 * (D8). The slug is unique per org, so a double click cannot make two.
 */
export async function ensurePrivateSpace(
  actor: KbActor,
  name = "My pages",
): Promise<{ id: number; created: boolean }> {
  const slug = privateSpaceSlug(actor.userId);

  const existing = await db.query.kbSpaces.findFirst({
    where: and(
      eq(kbSpaces.orgId, actor.orgId),
      eq(kbSpaces.slug, slug),
      isNull(kbSpaces.deletedAt),
    ),
    columns: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const [inserted] = await db
    .insert(kbSpaces)
    .values({
      orgId: actor.orgId,
      name,
      slug,
      type: "private",
      defaultVisibility: "private",
      createdById: actor.userId,
    })
    .onConflictDoNothing()
    .returning({ id: kbSpaces.id });

  // Lost the race: the other writer made it, so read theirs.
  if (!inserted) {
    const raced = await db.query.kbSpaces.findFirst({
      where: and(eq(kbSpaces.orgId, actor.orgId), eq(kbSpaces.slug, slug)),
      columns: { id: true },
    });
    if (!raced) throw new Error("private space could not be created");
    return { id: raced.id, created: false };
  }

  await db
    .insert(kbSpaceMembers)
    .values({
      orgId: actor.orgId,
      spaceId: inserted.id,
      userId: actor.userId,
      spaceRole: "admin",
    })
    .onConflictDoNothing();

  return { id: inserted.id, created: true };
}
