import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, passwordHistory } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PASSWORD_ZOD_SCHEMA } from "@/lib/utils/password-validation";
import { revokeAllUserSessions } from "@/lib/auth";
import { logger } from "@/lib/logger";

const PASSWORD_HISTORY_LIMIT = 5;

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PASSWORD_ZOD_SCHEMA,
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400);

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { id: true, password: true },
    });

    if (!user?.password) return err("User not found", 404);

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) return err("Current password is incorrect", 400);

    const history = await db.query.passwordHistory.findMany({
      where: eq(passwordHistory.userId, session.user.id),
      orderBy: [desc(passwordHistory.createdAt)],
      limit: PASSWORD_HISTORY_LIMIT,
    });

    for (const entry of history) {
      const isReused = await bcrypt.compare(newPassword, entry.passwordHash);
      if (isReused) {
        return err(`Cannot reuse one of your last ${PASSWORD_HISTORY_LIMIT} passwords`, 400);
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await db.transaction(async (tx) => {

      await tx.update(users)
        .set({
          password: newHash,
          isPasswordChangeRequired: false,
          passwordChangedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      await tx.insert(passwordHistory).values({
        userId: session.user.id,
        passwordHash: newHash,
      });

      const allHistory = await tx.query.passwordHistory.findMany({
        where: eq(passwordHistory.userId, session.user.id),
        orderBy: [desc(passwordHistory.createdAt)],
        columns: { id: true },
      });

      if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
        const toDelete = allHistory.slice(PASSWORD_HISTORY_LIMIT).map((h) => h.id);
        for (const id of toDelete) {
          await tx.delete(passwordHistory).where(eq(passwordHistory.id, id));
        }
      }
    });

    const MAX_INVALIDATE_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_INVALIDATE_RETRIES; attempt++) {
      try {
        await revokeAllUserSessions(session.user.id, { exceptSessionId: session.sessionId });
        break;
      } catch (e) {
        if (attempt < MAX_INVALIDATE_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        } else {
          logger.error("change-password: session revocation failed after retries — other sessions remain active", {
            userId: session.user.id,
            error: e,
          });
        }
      }
    }

    return ok({ success: true });
  });
}
