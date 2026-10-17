import { NextRequest, NextResponse } from "next/server";

import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { runRetention } from "@/lib/ats/retention";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/** MIYO-0679: the daily retention sweep. */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  if (!ATS_MODULE_ENABLED) return NextResponse.json({ success: true, skipped: "ats off" });
  const dupeCheck = await cronIdempotencyCheck("ats-retention");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await runRetention();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("ATS retention cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
