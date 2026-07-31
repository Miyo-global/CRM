import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { auth, mfaLoginVerifiedKey, MFA_LOGIN_VERIFIED_TTL } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { verifyTotpToken, verifyBackupCode, totpTimeStep } from "@/lib/totp";
import { decryptSecret } from "@/lib/secret-crypto";
import { db } from "@/lib/db";
import { users, mfaBackupCodes } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";

const schema = z.union([
  z.object({ token: z.string().length(6), backupCode: z.undefined() }),
  z.object({ backupCode: z.string().min(1), token: z.undefined() }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return err("Unauthorized", 401);
  }

  const sessionId = session.sessionId;
  if (!sessionId) {
    return err("Invalid session", 400);
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return err("Invalid request", 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { id: true, totpSecret: true, totpEnabled: true },
  });

  if (!user?.totpEnabled || !user.totpSecret) {
    return err("MFA is not enabled for this account", 400);
  }

  let verified = false;

  if (body.backupCode !== undefined) {
    const unusedCodes = (
      await db.query.mfaBackupCodes.findMany({
        where: eq(mfaBackupCodes.userId, user.id),
      })
    ).filter((c) => c.usedAt === null);

    for (const entry of unusedCodes) {
      if (await verifyBackupCode(body.backupCode, entry.codeHash)) {
        const consumed = await db
          .update(mfaBackupCodes)
          .set({ usedAt: new Date() })
          .where(and(eq(mfaBackupCodes.id, entry.id), isNull(mfaBackupCodes.usedAt)))
          .returning({ id: mfaBackupCodes.id });
        if (consumed.length === 1) verified = true;
        break;
      }
    }
  } else {
    verified = verifyTotpToken(body.token!, decryptSecret(user.totpSecret));
  }

  if (!verified) {
    logger.warn("Auth: failed MFA login verification", { userId: user.id });
    return err("Invalid code", 400);
  }

  if (!redis) {
    logger.error("Auth: MFA login-verify cannot persist grant — Redis unavailable", { userId: user.id });
    return err("MFA verification temporarily unavailable. Please try again shortly.", 503);
  }

  if (body.token !== undefined) {
    const step = totpTimeStep();
    const stepKey = `mfa:step:${user.id}`;
    const lastStep = await redis.get<number>(stepKey);
    if (typeof lastStep === "number" && step <= lastStep) {
      logger.warn("Auth: TOTP code replay rejected", { userId: user.id });
      return err("This code was already used. Wait for the next code.", 400);
    }
    await redis.set(stepKey, step, { ex: 120 });
  }

  await redis.set(mfaLoginVerifiedKey(sessionId), true, { ex: MFA_LOGIN_VERIFIED_TTL });

  logger.info("Auth: MFA login verification succeeded", { userId: user.id });
  return ok({ verified: true });
}
