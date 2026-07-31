import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("[Redis] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    }
    return null;
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();

export function isRedisEnabled(): boolean {
  return redis !== null;
}

export async function redisHealth(): Promise<{ status: "healthy" | "unhealthy"; latencyMs?: number }> {
  if (!redis) {
    return { status: "unhealthy" };
  }

  try {
    const start = Date.now();
    await redis.ping();
    const latencyMs = Date.now() - start;
    return { status: "healthy", latencyMs };
  } catch {
    return { status: "unhealthy" };
  }
}
