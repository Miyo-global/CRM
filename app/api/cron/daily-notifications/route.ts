import { NextRequest, NextResponse } from "next/server";
import { sendDailyNotifications } from "@/server/actions/daily-notifications";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("daily-notifications");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await sendDailyNotifications();

    return NextResponse.json({
      success: true,
      message: `Daily notifications sent: ${result.birthdayCount} birthdays, ${result.leaveCount} on-leave, ${result.anniversaryCount} anniversaries`,
      ...result,
    });
  } catch (error) {
    logger.error("Daily notification cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
