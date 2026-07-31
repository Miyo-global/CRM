import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { userSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redis } from "@/lib/redis";

const JWT_MAX_AGE_SECONDS = 8 * 60 * 60;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  return withAuth(async (session) => {
    const { sessionId } = await params;

    if (sessionId === session.sessionId) {
      return err("Cannot revoke your current session", 400);
    }

    const target = await db.query.userSessions.findFirst({
      where: and(eq(userSessions.id, sessionId), eq(userSessions.userId, session.user.id)),
    });

    if (!target) return err("Session not found", 404);

    if (redis) {
      await redis.set(`revoked:session:${sessionId}`, true, { ex: JWT_MAX_AGE_SECONDS });
    }

    await db.update(userSessions).set({ isRevoked: true }).where(eq(userSessions.id, sessionId));

    return ok({ success: true });
  });
}
