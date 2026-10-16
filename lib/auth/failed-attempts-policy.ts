/**
 * Failed-authentication cooldown policy (no DB access, so it is testable).
 *
 * Shared by password sign-in and MFA verification: MFA code entry had no
 * counter at all (QA-0038), and a flat 15-minute lock after five wrong
 * password guesses was easy to weaponise (QA-0037).
 */
export const FAILED_ATTEMPT_LOCK_THRESHOLD = 5;

export function cooldownMinutesFor(attempts: number): number {
  if (attempts >= 10) return 15;
  if (attempts >= 7) return 5;
  return 1;
}

export function isLocked(lockedUntil: Date | string | null | undefined): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

/** The lock a failed attempt produces, or null when below the threshold. */
export function lockAfterAttempt(attempts: number, now = Date.now()): Date | null {
  if (attempts < FAILED_ATTEMPT_LOCK_THRESHOLD) return null;
  return new Date(now + cooldownMinutesFor(attempts) * 60 * 1000);
}
