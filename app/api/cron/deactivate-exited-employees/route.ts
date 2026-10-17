import { NextRequest, NextResponse } from "next/server";
import { deactivateAfterLastWorkingDay } from "@/server/actions/deactivate-after-last-working-day";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

/** MIYO-0145: close the accounts of people whose last working day has passed. */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("deactivate-exited-employees");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await deactivateAfterLastWorkingDay();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Deactivate-exited-employees cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
