import { NextRequest, NextResponse } from "next/server";
import { markAbsentEmployeesAsLeave } from "@/server/actions/auto-absent-leave";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("auto-absent-leave", 12 * 60 * 60 * 1000);
  if (dupeCheck) return dupeCheck;

  try {
    const result = await markAbsentEmployeesAsLeave();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Auto absent-leave cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
