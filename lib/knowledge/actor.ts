/**
 * KB-0034: who is asking, resolved once per request.
 *
 * Every KB route needs the same three things: the module flag, the actor's org
 * and role, and which `kb:*` permissions they actually hold. Resolving the
 * permission set once and passing it around beats asking the database per
 * check, which is what a per-permission helper would do.
 *
 * Precedence matches lib/rbac/middleware.ts checkPermission: a user-level row
 * wins (including a deliberate deny), then the org's role_permissions rows,
 * then the role defaults in lib/rbac/permissions.ts.
 */
import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { NextResponse } from "next/server";

import type { AuthSession } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { permissions, rolePermissions, userPermissions } from "@/lib/db/schema";
import { KB_PERMISSION_NAMES, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";

import { kbDenied } from "./errors";
import { requireKnowledgeBase } from "./gate";
import type { KbActor } from "./authorization";

export type { KbActor };

/** Every `kb:*` permission this actor holds. */
export async function resolveKbPermissions(
  orgId: string,
  userId: string,
  role: string | null | undefined,
): Promise<string[]> {
  const granted = new Set<string>(
    (role ? (ROLE_DEFAULT_PERMISSIONS[role] ?? []) : []).filter((name) =>
      name.startsWith("kb:"),
    ),
  );

  const kbPermissionIds = await db
    .select({ id: permissions.id, name: permissions.name })
    .from(permissions)
    .where(inArray(permissions.name, [...KB_PERMISSION_NAMES]));

  if (kbPermissionIds.length === 0) {
    // The catalog has not been seeded into the DB; role defaults stand alone.
    return [...granted];
  }

  const byId = new Map(kbPermissionIds.map((row) => [row.id, row.name]));

  const [roleRows, userRows] = await Promise.all([
    role
      ? db
          .select({ permissionId: rolePermissions.permissionId })
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.role, role),
              or(eq(rolePermissions.orgId, orgId), isNull(rolePermissions.orgId)),
              inArray(rolePermissions.permissionId, [...byId.keys()]),
            ),
          )
      : Promise.resolve([]),
    db
      .select({ permissionId: userPermissions.permissionId, granted: userPermissions.granted })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.orgId, orgId),
          inArray(userPermissions.permissionId, [...byId.keys()]),
        ),
      ),
  ]);

  for (const row of roleRows) {
    const name = byId.get(row.permissionId);
    if (name) granted.add(name);
  }

  // A user row is the last word, so an explicit deny also has to win.
  for (const row of userRows) {
    const name = byId.get(row.permissionId);
    if (!name) continue;
    if (row.granted) granted.add(name);
    else granted.delete(name);
  }

  return [...granted];
}

export async function kbActorFromSession(session: AuthSession): Promise<KbActor> {
  const role = session.user.role ?? null;
  return {
    userId: session.user.id,
    orgId: session.orgId,
    role,
    permissions: await resolveKbPermissions(session.orgId, session.user.id, role),
  };
}

export function actorHolds(actor: KbActor, ...names: string[]): boolean {
  const held = new Set(actor.permissions ?? []);
  return names.some((name) => held.has(name));
}

/** 403 unless the actor holds one of `names`. */
export function requireKbPermission(
  actor: KbActor,
  ...names: string[]
): NextResponse<never> | null {
  return actorHolds(actor, ...names) ? null : kbDenied();
}

/**
 * The gate plus the actor, for a route handler body:
 *
 *   return withAuth(async (session) => {
 *     const ctx = await kbContext(session);
 *     if ("response" in ctx) return ctx.response;
 *     …use ctx.actor…
 *   }, req);
 */
export async function kbContext(
  session: AuthSession,
): Promise<{ actor: KbActor } | { response: NextResponse<never> }> {
  const gate = await requireKnowledgeBase(session.orgId);
  if (gate) return { response: gate };
  return { actor: await kbActorFromSession(session) };
}
