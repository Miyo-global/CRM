import { NextRequest, NextResponse } from "next/server";
import { generateAndSendWeeklyCeoRecap } from "@/server/actions/weekly-ceo-recap";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("weekly-ceo-recap");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await generateAndSendWeeklyCeoRecap();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Weekly CEO recap cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
