import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { redisHealth, isRedisEnabled } from "@/lib/redis";

interface HealthCheck {
  status: "ok" | "warning" | "error";
  latencyMs?: number;
}

export async function GET(req: NextRequest) {
  const checks: Record<string, HealthCheck> = {};
  const startTime = Date.now();

  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error" };
  }

  if (isRedisEnabled()) {
    const redisResult = await redisHealth();
    checks.redis = {
      status: redisResult.status === "healthy" ? "ok" : "error",
      latencyMs: redisResult.latencyMs,
    };
  } else {
    checks.redis = { status: "warning" };
  }

  checks.auth = process.env.NEXTAUTH_SECRET ? { status: "ok" } : { status: "error" };

  const emailConfigured = !!(
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_PORT)
  );
  checks.email = emailConfigured ? { status: "ok" } : { status: "warning" };

  checks.inngest = process.env.INNGEST_EVENT_KEY ? { status: "ok" } : { status: "warning" };

  const allHealthy = Object.values(checks).every((c) => c.status !== "error");
  const totalLatencyMs = Date.now() - startTime;

  const isInternalRequest =
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  const response = {
    status: allHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    latencyMs: totalLatencyMs,
    ...(isInternalRequest ? { checks } : {}),
  };

  return NextResponse.json(response, { status: allHealthy ? 200 : 503 });
}
