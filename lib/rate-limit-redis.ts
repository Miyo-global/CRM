import {
  checkRateLimit,
  resolveTier,
  isSuspiciousBot,
  type RateLimitResult,
} from "./rate-limit";

/** @deprecated name kept for callers — same as checkRateLimit (shared store when configured). */
export async function checkRateLimitRedis(
  tierName: string,
  ip: string,
): Promise<RateLimitResult> {
  return checkRateLimit(tierName, ip);
}

export async function checkRateLimitForRequest(
  pathname: string,
  ip: string,
): Promise<RateLimitResult> {
  const tierName = resolveTier(pathname);
  if (!tierName) return { allowed: true, retryAfterSecs: 0 };
  return checkRateLimit(tierName, ip);
}

export { resolveTier, isSuspiciousBot };
export type { RateLimitResult };
