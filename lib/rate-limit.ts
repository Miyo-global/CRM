

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export interface RateLimitTier {
  maxRequests: number;
  windowMs: number;
  progressive?: boolean;
  maxBlockMs?: number;
}

interface BucketEntry {
  timestamps: number[];
  blockedUntil: number;
  currentBlockMs: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  login: {
    maxRequests: 10,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 30 * 60_000,
  },
  "auth-write": {
    maxRequests: 20,
    windowMs: 5 * 60_000,
    progressive: true,
    maxBlockMs: 15 * 60_000,
  },
  "account-create": {
    maxRequests: 10,
    windowMs: 5 * 60_000,
  },
  ai: {
    maxRequests: 10,
    windowMs: 60_000,
  },
  chat: {
    maxRequests: 120,
    windowMs: 60_000,
  },
  upload: {
    maxRequests: 20,
    windowMs: 60_000,
  },
  "public-intake": {
    maxRequests: 10,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 10 * 60_000,
  },
  "landing-submit": {
    maxRequests: 5,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 10 * 60_000,
  },
  "api-default": {
    maxRequests: 100,
    windowMs: 60_000,
  },
  "api-key": {
    maxRequests: 300,
    windowMs: 60_000,
  },
  "api-key-ingest": {
    maxRequests: 60,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 5 * 60_000,
  },
};

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(tierName: string): Ratelimit | null {
  if (!redis) return null;

  const cached = upstashLimiters.get(tierName);
  if (cached) return cached;

  const tier = RATE_LIMIT_TIERS[tierName];
  if (!tier) return null;

  const windowSeconds = Math.ceil(tier.windowMs / 1000);
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tier.maxRequests, `${windowSeconds} s`),
    prefix: `rl:${tierName}`,
  });

  upstashLimiters.set(tierName, limiter);
  return limiter;
}

const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, BucketEntry>;
  __rateLimitLastCleanup?: number;
};

if (!globalStore.__rateLimitStore) {
  globalStore.__rateLimitStore = new Map<string, BucketEntry>();
}
if (!globalStore.__rateLimitLastCleanup) {
  globalStore.__rateLimitLastCleanup = Date.now();
}

const store = globalStore.__rateLimitStore;
const CLEANUP_INTERVAL = 60_000;
const MAX_STORE_SIZE = 10_000;

function cleanup(now: number) {
  if (now - (globalStore.__rateLimitLastCleanup ?? 0) < CLEANUP_INTERVAL) return;
  globalStore.__rateLimitLastCleanup = now;
  for (const [key, entry] of store) {
    const windowEnd = entry.timestamps.length > 0
      ? entry.timestamps[entry.timestamps.length - 1]
      : 0;
    const tier = keyToTier(key);
    const windowMs = tier?.windowMs ?? 60_000;
    if (now - windowEnd > windowMs && now > entry.blockedUntil) {
      store.delete(key);
    }
  }
  if (store.size > MAX_STORE_SIZE) {
    const excess = store.size - MAX_STORE_SIZE;
    const keys = store.keys();
    for (let i = 0; i < excess; i++) {
      const { value } = keys.next();
      if (value) store.delete(value);
    }
  }
}

function keyToTier(compositeKey: string): RateLimitTier | undefined {
  const firstColon = compositeKey.indexOf(":");
  const tierName = firstColon === -1 ? compositeKey : compositeKey.slice(0, firstColon);
  return RATE_LIMIT_TIERS[tierName];
}

function checkRateLimitInMemory(tierName: string, ip: string): RateLimitResult {
  const tier = RATE_LIMIT_TIERS[tierName];
  if (!tier) return { allowed: true, retryAfterSecs: 0 };

  const now = Date.now();
  cleanup(now);

  const key = `${tierName}:${ip}`;
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [now], blockedUntil: 0, currentBlockMs: 0 };
    store.set(key, entry);
    return { allowed: true, retryAfterSecs: 0 };
  }

  if (now < entry.blockedUntil) {
    if (tier.progressive) {
      const maxBlock = tier.maxBlockMs ?? 30 * 60_000;
      const nextBlock = Math.min(entry.currentBlockMs * 2, maxBlock);
      entry.currentBlockMs = nextBlock;
      entry.blockedUntil = now + nextBlock;
    }
    const retryAfterSecs = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  const windowStart = now - tier.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= tier.maxRequests) {
    if (tier.progressive) {
      const blockMs = entry.currentBlockMs > 0
        ? Math.min(entry.currentBlockMs * 2, tier.maxBlockMs ?? 30 * 60_000)
        : tier.windowMs;
      entry.currentBlockMs = blockMs;
      entry.blockedUntil = now + blockMs;
      return { allowed: false, retryAfterSecs: Math.ceil(blockMs / 1000) };
    }
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSecs = Math.max(1, Math.ceil((oldestInWindow + tier.windowMs - now) / 1000));
    return { allowed: false, retryAfterSecs };
  }

  entry.timestamps.push(now);
  if (entry.currentBlockMs > 0 && entry.timestamps.length <= tier.maxRequests / 2) {
    entry.currentBlockMs = 0;
  }
  return { allowed: true, retryAfterSecs: 0 };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSecs: number;
}

export async function checkRateLimit(
  tierName: string,
  ip: string,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(tierName);
  if (limiter) {
    try {
      const { success, reset } = await limiter.limit(`${tierName}:${ip}`);
      const retryAfterSecs = success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return { allowed: success, retryAfterSecs };
    } catch {

    }
  }
  return checkRateLimitInMemory(tierName, ip);
}

interface RouteRule {
  prefix: string;
  tier: string;
}

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/api/auth/callback/credentials", tier: "login" },
  { prefix: "/api/trpc/auth.forgotPassword", tier: "auth-write" },
  { prefix: "/api/trpc/auth.resetPassword", tier: "auth-write" },
  { prefix: "/api/trpc/auth.verifyEmail", tier: "auth-write" },
  { prefix: "/api/trpc/auth.acceptInvitation", tier: "auth-write" },
  { prefix: "/api/trpc/auth.resendVerificationEmail", tier: "auth-write" },
  { prefix: "/api/trpc/organization.createOrganization", tier: "account-create" },
  { prefix: "/api/trpc/organization.inviteUser", tier: "account-create" },
  { prefix: "/api/trpc/hr.employee.onboardEmployee", tier: "account-create" },
  { prefix: "/api/chat", tier: "chat" },
  { prefix: "/api/ai/", tier: "ai" },
  { prefix: "/api/storage/upload", tier: "upload" },
  { prefix: "/api/expenses/import", tier: "upload" },
  { prefix: "/api/public/", tier: "public-intake" },
  { prefix: "/api/landing/submit", tier: "landing-submit" },
  { prefix: "/api/auth/", tier: "auth-write" },
];

const NEXTAUTH_INTERNAL = new Set([
  "/api/auth/session",
  "/api/auth/csrf",
  "/api/auth/providers",
  "/api/auth/_log",
]);

const API_KEY_SELF_LIMITED = new Set(["/api/leads/ingest"]);

export function resolveTier(pathname: string): string | null {
  if (NEXTAUTH_INTERNAL.has(pathname)) return null;
  if (API_KEY_SELF_LIMITED.has(pathname)) return null;

  if (pathname.startsWith("/api/auth/callback/") && pathname !== "/api/auth/callback/credentials") return null;
  if (!pathname.startsWith("/api/")) return null;
  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) return rule.tier;
  }
  return "api-default";
}

const BOT_UA_PATTERNS = [
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /java/i,
  /libwww-perl/i,
  /wget/i,
  /curl/i,
  /httpie/i,
  /postmanruntime/i,
  /insomnia/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /nuclei/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /semrush/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /headlesschrome/i,
  /phantomjs/i,
];

export function isSuspiciousBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
