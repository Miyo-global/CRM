/**
 * KB-0048: the public share link.
 *
 * The token is shown once and only its SHA-256 hash is stored. A leaked
 * database then does not hand out readable pages, and a lookup is still a
 * single indexed equality on the hash. The revision is bumped on every issue
 * and revoke, so an old URL cannot be revived by re-issuing the same token.
 *
 * Streamline: SB/modules/kb/wiki/kb-public-token.ts, kb-page-public.service.ts.
 */
import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** 32 bytes of hex: long enough that guessing is not a threat model. */
export function generatePublicToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPublicToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function publicShareUrl(token: string, origin?: string | null): string {
  const base = (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/wiki/${token}`;
}
