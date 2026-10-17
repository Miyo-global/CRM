import "server-only";

import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSessions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const SESSION_CHECK_TTL = 60;

/**
 * Whether this JWT's session was revoked ("log out everywhere", admin revoke).
 * Shared by withAuth (API routes) and liveAuth (server actions), so a revoked
 * session cannot keep driving either (SEC-0007).
 *
 * A passed check is cached per session for SESSION_CHECK_TTL (MIYO-0011), so
 * other instances may lag up to that long. Returns "unavailable" when the
 * store cannot be read, and callers fail closed.
 */
export async function sessionRevocationState(
  session: Session,
): Promise<"live" | "revoked" | "unavailable"> {
  const sessionId = (session as { sessionId?: string }).sessionId;
  if (!sessionId) return "live";

  try {
    if (await redis.get<boolean>(`revoked:session:${sessionId}`)) return "revoked";
  } catch (e) {
    logger.error("session check: redis revocation read failed; using Postgres", { sessionId, error: e });
  }

  const okKey = `session:ok:${sessionId}:${session.user.id}`;
  if ((await redis.get<boolean>(okKey).catch(() => null)) === true) return "live";

  try {
    const row = await db.query.userSessions.findFirst({
      where: eq(userSessions.id, sessionId),
      columns: { isRevoked: true, userId: true },
    });
    if (row?.isRevoked || (row && row.userId !== session.user.id)) return "revoked";
    await redis.set(okKey, true, { ex: SESSION_CHECK_TTL }).catch(() => undefined);
    return "live";
  } catch (e) {
    logger.error("session check: Postgres revocation check failed (fail closed)", { sessionId, error: e });
    return "unavailable";
  }
}

/**
 * auth() for server actions: null unless the session is signed in, active,
 * past step-up MFA and not revoked. Server actions used plain auth(), which
 * only verifies the JWT, so a revoked session kept working until it expired.
 */
export async function liveAuth(): Promise<Session | null> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return null;
  if ((session as { mfaSatisfied?: boolean }).mfaSatisfied === false) return null;
  if (session.user.isActive === false) return null;
  return (await sessionRevocationState(session)) === "live" ? session : null;
}
