import { Ratelimit } from "@upstash/ratelimit";
import { redis, isRedisEnabled } from "./redis";
import { checkRateLimit as checkInMemoryRateLimit, resolveTier, isSuspiciousBot, type RateLimitResult } from "./rate-limit";

const rateLimiters: Record<string, Ratelimit> = {};

function createRateLimiter(tierName: string): Ratelimit | null {
  if (!isRedisEnabled() || !redis) return null;

  const configs: Record<string, { requests: number; window: `${number} s` | `${number} m` }> = {
    login: { requests: 5, window: "60 s" },
    "auth-write": { requests: 5, window: "300 s" },
    "account-create": { requests: 5, window: "300 s" },
    ai: { requests: 10, window: "60 s" },
    upload: { requests: 20, window: "60 s" },
    "public-intake": { requests: 10, window: "60 s" },
    "api-default": { requests: 100, window: "60 s" },
  };

  const config = configs[tierName];
  if (!config) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `rl:${tierName}`,
    analytics: true,
  });
}

function getRateLimiter(tierName: string): Ratelimit | null {
  if (!rateLimiters[tierName]) {
    const limiter = createRateLimiter(tierName);
    if (limiter) {
      rateLimiters[tierName] = limiter;
    }
  }
  return rateLimiters[tierName] ?? null;
}

export async function checkRateLimitRedis(
  tierName: string,
  ip: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(tierName);

  if (!limiter) {
    return checkInMemoryRateLimit(tierName, ip);
  }

  try {
    const result = await limiter.limit(ip);

    if (!result.success) {
      const retryAfterMs = result.reset - Date.now();
      const retryAfterSecs = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return { allowed: false, retryAfterSecs };
    }

    return { allowed: true, retryAfterSecs: 0 };
  } catch {
    return checkInMemoryRateLimit(tierName, ip);
  }
}

export async function checkRateLimitForRequest(pathname: string, ip: string): Promise<RateLimitResult> {
  const tierName = resolveTier(pathname);
  if (!tierName) return { allowed: true, retryAfterSecs: 0 };

  return checkRateLimitRedis(tierName, ip);
}

export { resolveTier, isSuspiciousBot };
