/**
 * KB-0004: how far a KB access level reaches.
 *
 * Ported from Streamline SB/modules/kb/core/authorization/knowledge-authorization.types.ts.
 * IDs are strings here (CRM uuid/text) and the Drizzle-SQL scope types stay out
 * until the query layer needs them (KB-0030 onward).
 */

export const KB_PAGE_ACTIONS = ["view", "comment", "edit", "manage"] as const;
export type KbPageAction = (typeof KB_PAGE_ACTIONS)[number];

const ACTION_RANK: Record<KbPageAction, number> = {
  view: 0,
  comment: 1,
  edit: 2,
  manage: 3,
};

/** Every level that is at least as strong as `action`, for `inArray(...)` filters. */
export function accessLevelsSatisfying(action: KbPageAction): KbPageAction[] {
  return KB_PAGE_ACTIONS.filter((level) => ACTION_RANK[level] >= ACTION_RANK[action]);
}

export function accessSatisfies(held: KbPageAction, required: KbPageAction): boolean {
  return ACTION_RANK[held] >= ACTION_RANK[required];
}

/** Why access was granted. Logged on every decision so denials are explainable. */
export const KB_ACCESS_ROUTES = [
  "owner",
  "admin",
  "creator",
  "organization",
  "public",
  "space",
  "project",
  "grant",
] as const;
export type KbAccessRoute = (typeof KB_ACCESS_ROUTES)[number];

export interface KbPageScope {
  orgId: string;
  pageId: string;
  /** The action that was asked for and allowed. */
  action: KbPageAction;
  /**
   * The strongest access the actor holds. Callers that show or branch on
   * "what may this person do" read this, not `action` (FR1-001).
   */
  held: KbPageAction;
  via: KbAccessRoute;
}

export interface KbSpaceScope {
  orgId: string;
  spaceId: string;
  action: KbPageAction;
  /** The strongest access the actor holds in the space. */
  held: KbPageAction;
  via: KbAccessRoute;
}

export type AccessDecision<TScope> =
  | { outcome: "allowed"; scope: TScope }
  | { outcome: "notFound" }
  | { outcome: "denied"; reason: string };

export function allowed<TScope>(scope: TScope): AccessDecision<TScope> {
  return { outcome: "allowed", scope };
}

/** Another org's page, or one the actor may not even know exists. */
export function notFound<TScope>(): AccessDecision<TScope> {
  return { outcome: "notFound" };
}

/** Visible, but this action is out of reach. */
export function denied<TScope>(reason: string): AccessDecision<TScope> {
  return { outcome: "denied", reason };
}
