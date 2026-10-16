import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { lockAfterAttempt } from "./failed-attempts-policy";

export {
  FAILED_ATTEMPT_LOCK_THRESHOLD,
  cooldownMinutesFor,
  isLocked,
  lockAfterAttempt,
} from "./failed-attempts-policy";

/**
 * Records one failed attempt and returns the state after it.
 *
 * Password sign-in and MFA verification share this counter, so unlimited MFA
 * code guessing is no longer possible (QA-0038).
 */
export async function recordFailedAttempt(
  userId: string,
  previousAttempts: number | null | undefined,
): Promise<{ attempts: number; lockedUntil: Date | null }> {
  const attempts = (previousAttempts ?? 0) + 1;
  const lockedUntil = lockAfterAttempt(attempts);

  await db
    .update(users)
    .set(lockedUntil ? { loginAttempts: attempts, lockedUntil } : { loginAttempts: attempts })
    .where(eq(users.id, userId));

  return { attempts, lockedUntil };
}

export async function clearFailedAttempts(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ loginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}
