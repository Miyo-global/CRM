/**
 * Upstash Redis over its REST API, used when credentials are configured.
 *
 * The shared store matters for anything that must hold across serverless
 * isolates: session-revocation flags and rate limits were process-local, so
 * on more than one instance "log out everywhere" was unreliable (QA-0068).
 *
 * Plain fetch, so no extra dependency.
 */
import { logger } from "@/lib/logger";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export function hasUpstashCredentials(): boolean {
  return Boolean(url && token);
}

async function command<T>(args: (string | number)[]): Promise<T | null> {
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      logger.error("Upstash command failed", { command: args[0], status: res.status });
      return null;
    }
    const body = (await res.json()) as { result?: T; error?: string };
    if (body.error) {
      logger.error("Upstash command error", { command: args[0], error: body.error });
      return null;
    }
    return (body.result ?? null) as T | null;
  } catch (error) {
    logger.error("Upstash request failed", {
      command: args[0],
      error: error instanceof Error ? error.message : "Unknown",
    });
    return null;
  }
}

/** Values are stored as JSON so objects survive the round trip. */
export const upstash = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await command<string>(["GET", key]);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<"OK"> {
    const payload = JSON.stringify(value);
    const args: (string | number)[] = ["SET", key, payload];
    if (typeof opts?.ex === "number" && opts.ex > 0) {
      args.push("EX", Math.floor(opts.ex));
    }
    await command(args);
    return "OK";
  },

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return (await command<number>(["DEL", ...keys])) ?? 0;
  },

  async incr(key: string): Promise<number> {
    return (await command<number>(["INCR", key])) ?? 0;
  },

  async expire(key: string, seconds: number): Promise<number> {
    return (await command<number>(["EXPIRE", key, Math.floor(seconds)])) ?? 0;
  },

  async keys(pattern: string): Promise<string[]> {
    return (await command<string[]>(["KEYS", pattern])) ?? [];
  },

  async ping(): Promise<"PONG"> {
    await command<string>(["PING"]);
    return "PONG";
  },
};
