/**
 * KB-0047: the page lifecycle transitions.
 *
 * Each of these is a small write, but they share two rules worth stating once:
 * a visibility change bumps acl_revision (the indexed chunks carry a copy of
 * the page's ACL and have to be told it is stale), and verification is a window
 * rather than a flag — a page verified a year ago is not verified now.
 *
 * Streamline: SB/modules/kb/wiki/kb-page-status.service.ts,
 * kb-page-governance.util.ts, help-centre ARTICLE_VERIFIED_WINDOW_DAYS = 180.
 */
import "server-only";

/** How long a verification lasts when the page sets no interval of its own. */
export const DEFAULT_VERIFIED_WINDOW_DAYS = 180;

export function verifiedUntil(
  from: Date,
  reviewIntervalDays: number | null | undefined,
): Date {
  const days = reviewIntervalDays && reviewIntervalDays > 0
    ? reviewIntervalDays
    : DEFAULT_VERIFIED_WINDOW_DAYS;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export type KbTrustState = "unverified" | "verified" | "verification_expired";

/** Pure: what the trust state is *now*, given what was recorded. */
export function trustStateAt(
  recorded: KbTrustState,
  verifiedUntilAt: Date | null | undefined,
  now: Date,
): KbTrustState {
  if (recorded !== "verified") return recorded;
  if (!verifiedUntilAt) return "verified";
  return verifiedUntilAt.getTime() <= now.getTime() ? "verification_expired" : "verified";
}

/** Who may make a page public: an org admin, or a publisher in its space. */
export function canPublishPublicly(options: {
  isKbAdmin: boolean;
  permissions: readonly string[];
  spaceRole: string | null;
  publicSharingEnabled: boolean;
}): boolean {
  if (!options.publicSharingEnabled) return false;
  return (
    options.isKbAdmin ||
    options.permissions.includes("kb:pages:manage") ||
    options.spaceRole === "publisher" ||
    options.spaceRole === "admin"
  );
}
