import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { userSessions } from "@/lib/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { redis } from "@/lib/redis";

const JWT_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const sessionId = session.sessionId;

    if (sessionId) {
      await db
        .update(userSessions)
        .set({
          lastActive: new Date(),
          userAgent: req.headers.get("user-agent") ?? undefined,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? undefined,
        })
        .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, session.user.id)));
    }

    const sessions = await db.query.userSessions.findMany({
      where: and(eq(userSessions.userId, session.user.id), eq(userSessions.isRevoked, false)),
      orderBy: [desc(userSessions.lastActive)],
      columns: { id: true, userAgent: true, ipAddress: true, lastActive: true, createdAt: true },
    });

    return ok(sessions.map((s) => ({ ...s, isCurrent: s.id === sessionId })));
  });
}

export async function DELETE() {
  return withAuth(async (session) => {
    const currentSessionId = session.sessionId;

    const others = await db.query.userSessions.findMany({
      where: and(eq(userSessions.userId, session.user.id), eq(userSessions.isRevoked, false)),
      columns: { id: true },
    });

    const toRevoke = others.filter((s) => s.id !== currentSessionId);
    const r = redis;

    if (toRevoke.length > 0) {
      if (r) {
        await Promise.all(
          toRevoke.map((s) =>
            r.set(`revoked:session:${s.id}`, true, { ex: JWT_MAX_AGE_SECONDS })
          )
        );
      }

      const otherSessionsFilter = currentSessionId
        ? and(eq(userSessions.userId, session.user.id), ne(userSessions.id, currentSessionId))
        : eq(userSessions.userId, session.user.id);

      await db
        .update(userSessions)
        .set({ isRevoked: true })
        .where(otherSessionsFilter);
    }

    return ok({ revokedCount: toRevoke.length });
  });
}
