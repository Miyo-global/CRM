import { NextRequest, NextResponse } from "next/server";
import { sendExpiryReminders } from "@/server/actions/expiry-reminders";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

/** MIYO-0156: daily document-expiry and password-expiry reminders. */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("expiry-reminders");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await sendExpiryReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("Expiry reminders cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
