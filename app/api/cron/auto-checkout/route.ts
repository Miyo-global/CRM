import { NextRequest, NextResponse } from "next/server";
import { processAutoCheckout } from "@/server/actions/auto-checkout";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("auto-checkout");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await processAutoCheckout();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Auto-checkout cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
