import { NextRequest, NextResponse } from "next/server";
import { closeExpiredJobPostings } from "@/lib/hr/close-expired-job-postings";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("close-expired-job-postings");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await closeExpiredJobPostings();
    return NextResponse.json({
      success: true,
      message: `Closed ${result.closedCount} expired job posting(s)`,
      ...result,
    });
  } catch (error) {
    logger.error("Close expired job postings cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
