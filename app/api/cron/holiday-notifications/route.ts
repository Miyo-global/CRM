import { NextRequest, NextResponse } from "next/server";
import { sendHolidayNotifications } from "@/server/actions/holiday-actions";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("holiday-notifications");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await sendHolidayNotifications();

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sent notifications for ${result.count} upcoming holidays`,
      count: result.count,
    });
  } catch (error) {
    logger.error("Holiday notification cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
