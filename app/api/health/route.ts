import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { redisHealth, isRedisEnabled, isSharedRedis } from "@/lib/redis";
import { isEmailConfigured } from "@/lib/email/config";

/**
 * Columns added by recent migrations. Selecting them with LIMIT 0 fails fast
 * when a migration was not applied (the 16 Oct outage: projects.deleted_at).
 * Only run for internal callers (post-deploy smoke workflow).
 */
const SCHEMA_PROBES = [
  sql`SELECT 1 FROM projects WHERE deleted_at IS NULL LIMIT 1`,
  sql`SELECT version, rank, deleted_at FROM tickets LIMIT 0`,
  sql`SELECT id FROM ticket_activity LIMIT 0`,
  sql`SELECT id FROM ticket_comment_mentions LIMIT 0`,
  sql`SELECT id FROM ticket_comment_reactions LIMIT 0`,
  sql`SELECT project_id, project_role FROM invitations LIMIT 0`,
  sql`SELECT id FROM project_client_grants LIMIT 0`,
];

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

  const isInternalRequest =
    !!process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (isInternalRequest && checks.database.status === "ok") {
    try {
      await Promise.all(SCHEMA_PROBES.map((q) => db.execute(q)));
      checks.schema = { status: "ok" };
    } catch {
      checks.schema = { status: "error" };
    }
  }

  if (isRedisEnabled()) {
    const redisResult = await redisHealth();
    checks.redis = {
      // A process-local store is a warning, not an error: it works on one
      // instance but cannot back MFA markers or revocation across several
      // (QA-0068).
      status:
        redisResult.status !== "healthy"
          ? "error"
          : isSharedRedis()
            ? "ok"
            : "warning",
      latencyMs: redisResult.latencyMs,
    };
  } else {
    checks.redis = { status: "warning" };
  }

  checks.auth = process.env.NEXTAUTH_SECRET ? { status: "ok" } : { status: "error" };

  checks.email = isEmailConfigured() ? { status: "ok" } : { status: "warning" };

  checks.inngest = process.env.INNGEST_EVENT_KEY ? { status: "ok" } : { status: "warning" };

  const allHealthy = Object.values(checks).every((c) => c.status !== "error");
  const totalLatencyMs = Date.now() - startTime;

  const response = {
    status: allHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    latencyMs: totalLatencyMs,
    ...(isInternalRequest ? { checks } : {}),
  };

  return NextResponse.json(response, { status: allHealthy ? 200 : 503 });
}
