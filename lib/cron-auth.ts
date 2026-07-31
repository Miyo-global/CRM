import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export function verifyCronSecret(authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const a = Buffer.from(token, "utf-8");
    const b = Buffer.from(cronSecret, "utf-8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
const cronLastRun = new Map<string, number>();
let cronTableEnsured = false;

async function ensureCronRunsTable(): Promise<void> {
  if (cronTableEnsured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cron_runs (
      job_name text NOT NULL,
      bucket text NOT NULL,
      ran_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (job_name, bucket)
    )
  `);
  cronTableEnsured = true;
}

function computeDateBucket(windowMs: number): string {
  const bucketMs = Math.max(60_000, windowMs);
  const epoch = Math.floor(Date.now() / bucketMs);
  return String(epoch);
}

export async function cronIdempotencyCheck(
  jobName: string,
  windowMs: number = 5 * 60_000,
  bucketOverride?: string
): Promise<NextResponse | null> {
  const bucket = bucketOverride ?? computeDateBucket(windowMs);
  try {
    await ensureCronRunsTable();
    const inserted = await db.execute<{ job_name: string }>(sql`
      INSERT INTO cron_runs (job_name, bucket, ran_at)
      VALUES (${jobName}, ${bucket}, now())
      ON CONFLICT DO NOTHING
      RETURNING job_name
    `);

    const rows = (inserted as unknown as { rows?: unknown[] }).rows ?? (inserted as unknown as unknown[]);
    const count = Array.isArray(rows) ? rows.length : 0;
    if (count === 0) {
      return NextResponse.json(
        { skipped: true, message: `Job "${jobName}" already ran for bucket ${bucket}` },
        { status: 200 }
      );
    }
    return null;
  } catch {
    const now = Date.now();
    const lastRun = cronLastRun.get(`${jobName}:${bucket}`);
    if (lastRun && now - lastRun < windowMs) {
      return NextResponse.json(
        { skipped: true, message: `Job "${jobName}" already ran ${Math.round((now - lastRun) / 1000)}s ago` },
        { status: 200 }
      );
    }
    cronLastRun.set(`${jobName}:${bucket}`, now);
    return null;
  }
}
