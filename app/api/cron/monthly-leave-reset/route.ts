import { NextRequest, NextResponse } from "next/server";
import {
  expireUnusedMonthlyCasualLeaves,
  resetYearlyLeaveBalances,
} from "@/server/actions/leave-actions";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("monthly-leave-reset");
  if (dupeCheck) return dupeCheck;

  try {
    const istMonth = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      month: "numeric",
    }).format(new Date());
    const isJanuary = istMonth === "1";
    const expiryResult = await expireUnusedMonthlyCasualLeaves();
    let yearlyResult = null;
    if (isJanuary) {
      yearlyResult = await resetYearlyLeaveBalances();
    }

    return NextResponse.json({
      success: true,
      monthlyExpiry: expiryResult,
      yearlyReset: yearlyResult,
    });
  } catch (error) {
    logger.error("Monthly leave reset cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
