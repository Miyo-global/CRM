import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { CAREERS_JOBS_TAG } from "@/lib/ats/careers-cache";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/**
 * MIYO-0634: close published jobs whose closing date has passed, once a day.
 * Runs from vercel.json like every other scheduled job here.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("close-expired-jobs");
  if (dupeCheck) return dupeCheck;

  try {
    const closed = await db
      .update(jobPostings)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(
        and(
          eq(jobPostings.status, "OPEN"),
          isNotNull(jobPostings.closesAt),
          lte(jobPostings.closesAt, new Date()),
        ),
      )
      .returning({ id: jobPostings.id });

    if (closed.length > 0) revalidateTag(CAREERS_JOBS_TAG, "max");

    return NextResponse.json({ success: true, closed: closed.length });
  } catch (error) {
    logger.error("Close-expired-jobs cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
