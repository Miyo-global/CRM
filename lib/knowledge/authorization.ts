/**
 * KB-0027: who may read and change a page.
 *
 * The decision is split in two on purpose, the way lib/projects/project-access.ts
 * is: `decidePageAccess` is pure and holds the whole rule, and
 * `resolvePageAccess` does the loading. The rule is then testable as a matrix
 * rather than through a database.
 *
 * Two invariants worth stating, because they are easy to get wrong:
 *   - A page in another org, a soft-deleted page, and a private page the actor
 *     has no route to all answer notFound, never denied. Denied admits the page
 *     exists, and for a private page that is itself a leak.
 *   - Access is the strongest of the routes the actor holds, not the first one
 *     found, so a viewer seat in a space does not shadow an edit grant.
 *
 * Streamline: SB/modules/kb/core/authorization/knowledge-authorization.service.ts,
 * knowledge-page-scope.ts, knowledge-space-scope.ts, retrieval/kb-page-visibility.ts.
 */
import "server-only";

import { and, eq, exists, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPageGrants, kbPages, kbSpaceMembers, projectMembers } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/constants/roles";

import {
  accessSatisfies,
  allowed,
  denied,
  notFound,
  type AccessDecision,
  type KbAccessRoute,
  type KbPageAction,
  type KbPageScope,
  type KbSpaceScope,
} from "./access-levels";
import { spaceRoleAction } from "./space-access";

export interface KbActor {
  userId: string;
  orgId: string;
  role: string | null | undefined;
  /** Org-wide kb:* permissions the actor holds, beyond their role defaults. */
  permissions?: readonly string[];
}

export interface KbPageRow {
  id: number;
  orgId: string;
  spaceId: number | null;
  projectId: number | null;
  visibility: string;
  ownerUserId: string | null;
  createdById: string | null;
  deletedAt: Date | null;
}

export interface PageAccessContext {
  actor: KbActor;
  page: KbPageRow | null;
  /** CEO/ADMIN, or kb:pages:manage. */
  isKbAdmin: boolean;
  /** kb:pages:update, which is what lets an ordinary org page be edited. */
  canEditOrgWide: boolean;
  /** kb_space_members.space_role for this actor in the page's space. */
  spaceRole: string | null;
  /** From lib/projects/project-access.ts, for a page attached to a project. */
  projectRole: "view" | "contribute" | "manage" | null;
  /** The strongest live grant on this page for this actor or their role. */
  grantAccess: KbPageAction | null;
}

const PROJECT_ROLE_ACTION: Record<"view" | "contribute" | "manage", KbPageAction> = {
  view: "view",
  contribute: "edit",
  manage: "manage",
};

function strongest(
  routes: Array<[KbPageAction, KbAccessRoute] | null>,
): [KbPageAction, KbAccessRoute] | null {
  let best: [KbPageAction, KbAccessRoute] | null = null;
  for (const route of routes) {
    if (!route) continue;
    if (!best || accessSatisfies(route[0], best[0])) best = route;
  }
  return best;
}

export function decidePageAccess(
  ctx: PageAccessContext,
  action: KbPageAction,
): AccessDecision<KbPageScope> {
  const { actor, page } = ctx;

  if (!page || page.deletedAt || page.orgId !== actor.orgId) {
    return notFound();
  }

  const isOwner = !!page.ownerUserId && page.ownerUserId === actor.userId;
  const isCreator = !!page.createdById && page.createdById === actor.userId;

  // Everyone in the org may read an org-visible page; editing it takes a
  // permission or a seat. A public page is readable by the org too — the
  // anonymous reader comes in through the share token, not through here.
  const orgRoute: [KbPageAction, KbAccessRoute] | null =
    page.visibility === "org" || page.visibility === "public"
      ? [ctx.canEditOrgWide ? "edit" : "view", "organization"]
      : null;

  // A private page is reachable only by the people named on it: its creator,
  // its owner, a grantee, or an admin. A seat in the surrounding space does
  // not open it, which is the whole point of marking it private.
  const isPrivate = page.visibility === "private";

  const best = strongest([
    ctx.isKbAdmin ? ["manage", "admin"] : null,
    isOwner ? ["manage", "owner"] : null,
    isCreator ? ["manage", "creator"] : null,
    isPrivate ? null : orgRoute,
    !isPrivate && ctx.spaceRole && page.spaceId !== null
      ? [spaceRoleAction(ctx.spaceRole) ?? "view", "space"]
      : null,
    !isPrivate && ctx.projectRole && page.projectId !== null
      ? [PROJECT_ROLE_ACTION[ctx.projectRole], "project"]
      : null,
    ctx.grantAccess ? [ctx.grantAccess, "grant"] : null,
  ]);

  if (!best) {
    // No route at all. For a private page the actor should not learn it exists.
    return notFound();
  }

  const [held, via] = best;
  if (!accessSatisfies(held, action)) {
    return denied(`${action} needs more than ${held} (via ${via})`);
  }

  return allowed({ orgId: page.orgId, pageId: String(page.id), action, held, via });
}

function holdsPermission(actor: KbActor, permission: string): boolean {
  return (actor.permissions ?? []).includes(permission);
}

export function isKbAdmin(actor: KbActor): boolean {
  return isAdminOrOwner(actor.role) || holdsPermission(actor, "kb:pages:manage");
}

/** Loads what the rule needs, then applies it. */
export async function resolvePageAccess(
  actor: KbActor,
  pageId: number,
  action: KbPageAction,
): Promise<AccessDecision<KbPageScope>> {
  if (!Number.isSafeInteger(pageId) || pageId <= 0) return notFound();

  const page = await db.query.kbPages.findFirst({
    where: and(eq(kbPages.id, pageId), eq(kbPages.orgId, actor.orgId)),
    columns: {
      id: true,
      orgId: true,
      spaceId: true,
      projectId: true,
      visibility: true,
      ownerUserId: true,
      createdById: true,
      deletedAt: true,
    },
  });

  if (!page) return notFound();

  const [spaceSeat, grants, projectSeat] = await Promise.all([
    page.spaceId === null
      ? Promise.resolve(undefined)
      : db.query.kbSpaceMembers.findFirst({
          where: and(
            eq(kbSpaceMembers.orgId, actor.orgId),
            eq(kbSpaceMembers.spaceId, page.spaceId),
            actor.role
              ? or(eq(kbSpaceMembers.userId, actor.userId), eq(kbSpaceMembers.role, actor.role))
              : eq(kbSpaceMembers.userId, actor.userId),
          ),
          columns: { spaceRole: true, userId: true },
        }),
    db.query.kbPageGrants.findMany({
      where: and(
        eq(kbPageGrants.orgId, actor.orgId),
        eq(kbPageGrants.pageId, pageId),
        isNull(kbPageGrants.revokedAt),
        actor.role
          ? or(eq(kbPageGrants.userId, actor.userId), eq(kbPageGrants.role, actor.role))
          : eq(kbPageGrants.userId, actor.userId),
      ),
      columns: { access: true },
    }),
    page.projectId === null
      ? Promise.resolve(undefined)
      : db.query.projectMembers.findFirst({
          where: and(
            eq(projectMembers.projectId, page.projectId),
            eq(projectMembers.userId, actor.userId),
          ),
          columns: { role: true },
        }),
  ]);

  const grantAccess = strongest(
    grants.map((grant) => [grant.access as KbPageAction, "grant" as KbAccessRoute]),
  );

  return decidePageAccess(
    {
      actor,
      page,
      isKbAdmin: isKbAdmin(actor),
      canEditOrgWide: holdsPermission(actor, "kb:pages:update"),
      spaceRole: spaceSeat?.spaceRole ?? null,
      projectRole: projectRoleFor(projectSeat?.role),
      grantAccess: grantAccess?.[0] ?? null,
    },
    action,
  );
}

function projectRoleFor(role: string | null | undefined): "view" | "contribute" | "manage" | null {
  switch (role) {
    case "OWNER":
    case "MANAGER":
      return "manage";
    case "CONTRIBUTOR":
      return "contribute";
    case "VIEWER":
      return "view";
    default:
      return null;
  }
}

/**
 * The same rule as a SQL predicate, for lists and search. It is the read half
 * only: a row this returns still goes through decidePageAccess before any write.
 */
export function visiblePagesPredicate(actor: KbActor): SQL<unknown> {
  const live = and(eq(kbPages.orgId, actor.orgId), isNull(kbPages.deletedAt));

  if (isKbAdmin(actor)) return live as SQL<unknown>;

  const hasGrant = exists(
    db
      .select({ one: kbPageGrants.id })
      .from(kbPageGrants)
      .where(
        and(
          eq(kbPageGrants.orgId, actor.orgId),
          eq(kbPageGrants.pageId, kbPages.id),
          isNull(kbPageGrants.revokedAt),
          actor.role
            ? or(eq(kbPageGrants.userId, actor.userId), eq(kbPageGrants.role, actor.role))
            : eq(kbPageGrants.userId, actor.userId),
        ),
      ),
  );

  return and(
    live,
    or(
      // An org or public page is readable by anyone in the org, so a space or
      // project seat adds nothing to the read predicate; a private page is
      // readable only by the people named on it.
      eq(kbPages.visibility, "org"),
      eq(kbPages.visibility, "public"),
      eq(kbPages.createdById, actor.userId),
      eq(kbPages.ownerUserId, actor.userId),
      hasGrant,
    ),
  ) as SQL<unknown>;
}

export interface SpaceAccessContext {
  actor: KbActor;
  space: { id: number; orgId: string; deletedAt: Date | null; createdById: string | null } | null;
  spaceRole: string | null;
  isKbAdmin: boolean;
  /** kb:spaces:view, which lets any member at least read a space's shell. */
  canViewOrgWide: boolean;
}

export function decideSpaceAccess(
  ctx: SpaceAccessContext,
  action: KbPageAction,
): AccessDecision<KbSpaceScope> {
  const { actor, space } = ctx;
  if (!space || space.deletedAt || space.orgId !== actor.orgId) return notFound();

  const best = strongest([
    ctx.isKbAdmin ? ["manage", "admin"] : null,
    space.createdById === actor.userId ? ["manage", "creator"] : null,
    ctx.spaceRole ? [spaceRoleAction(ctx.spaceRole) ?? "view", "space"] : null,
    ctx.canViewOrgWide ? ["view", "organization"] : null,
  ]);

  if (!best) return notFound();

  const [held, via] = best;
  if (!accessSatisfies(held, action)) {
    return denied(`${action} needs more than ${held} (via ${via})`);
  }
  return allowed({ orgId: space.orgId, spaceId: String(space.id), action, held, via });
}
