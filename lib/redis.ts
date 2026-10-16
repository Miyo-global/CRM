/**
 * Key store for session markers, short TTLs and rate helpers.
 *
 * With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, this is a
 * shared Redis, which is what the MFA login marker, the TOTP replay guard,
 * session revocation and rate limits need to work across serverless isolates
 * (QA-0068). Without them it falls back to a process-local map, which is fine
 * for a single instance and for tests but is not shared.
 */
import { hasUpstashCredentials, upstash } from "./redis-upstash";

type Entry = { value: unknown; expiresAt: number | null };

const store = new Map<string, Entry>();

function isExpired(entry: Entry): boolean {
  return entry.expiresAt != null && Date.now() >= entry.expiresAt;
}

function read<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

function write(key: string, value: unknown, opts?: { ex?: number }): void {
  const expiresAt =
    typeof opts?.ex === "number" && opts.ex > 0 ? Date.now() + opts.ex * 1000 : null;
  store.set(key, { value, expiresAt });
}

function matchKeys(pattern: string): string[] {
  if (!pattern.includes("*")) {
    return store.has(pattern) ? [pattern] : [];
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(`^${escaped}$`);
  const out: string[] = [];
  for (const key of store.keys()) {
    if (re.test(key) && !isExpired(store.get(key)!)) out.push(key);
  }
  return out;
}

const memory = {
  async get<T>(key: string): Promise<T | null> {
    return read<T>(key);
  },

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<"OK"> {
    write(key, value, opts);
    return "OK";
  },

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (store.delete(key)) n += 1;
    }
    return n;
  },

  async incr(key: string): Promise<number> {
    const existing = store.get(key);
    const current =
      existing && !isExpired(existing) && typeof existing.value === "number"
        ? existing.value
        : 0;
    const next = current + 1;
    store.set(key, {
      value: next,
      expiresAt: existing && !isExpired(existing) ? existing.expiresAt : null,
    });
    return next;
  },

  async expire(key: string, seconds: number): Promise<number> {
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      store.delete(key);
      return 0;
    }
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  },

  async keys(pattern: string): Promise<string[]> {
    return matchKeys(pattern);
  },

  async ping(): Promise<"PONG"> {
    return "PONG";
  },
};

export const redis = hasUpstashCredentials() ? upstash : memory;

/** True when the store is shared across instances. */
export function isSharedRedis(): boolean {
  return hasUpstashCredentials();
}

export function isRedisEnabled(): boolean {
  return true;
}

export async function redisHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs?: number }> {
  const start = Date.now();
  await redis.ping();
  return { status: "healthy", latencyMs: Date.now() - start };
}
