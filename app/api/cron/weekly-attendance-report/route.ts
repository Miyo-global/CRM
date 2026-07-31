import { NextRequest, NextResponse } from "next/server";
import { generateAndSendWeeklyReport } from "@/server/actions/weekly-attendance-report";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("weekly-attendance-report");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await generateAndSendWeeklyReport();

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Weekly attendance report cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
