import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { userSessions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { z } from "zod";

const JWT_MAX_AGE_SECONDS = 8 * 60 * 60;

const revokeBatchSchema = z.object({
  sessionIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, revokeBatchSchema);
    const currentSessionId = session.sessionId;

    const sessionIds = [...new Set(body.sessionIds)].filter(
      (id) => id !== currentSessionId,
    );

    if (sessionIds.length === 0) {
      return err("Cannot revoke your current session or no valid sessions selected.", 400);
    }

    const targets = await db.query.userSessions.findMany({
      where: and(
        eq(userSessions.userId, session.user.id),
        eq(userSessions.isRevoked, false),
        inArray(userSessions.id, sessionIds),
      ),
      columns: { id: true },
    });

    if (targets.length === 0) {
      return err("No matching sessions found.", 404);
    }

    const idsToRevoke = targets.map((t) => t.id);

    const r = redis;
    if (r) {
      await Promise.all(
        idsToRevoke.map((id) =>
          r.set(`revoked:session:${id}`, true, { ex: JWT_MAX_AGE_SECONDS }),
        ),
      );
    }

    await db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(inArray(userSessions.id, idsToRevoke));

    return ok({ revokedCount: idsToRevoke.length });
  });
}
