import { NextRequest, NextResponse } from "next/server";
import { generateAndSendMonthlyExpenseReport } from "@/server/actions/monthly-expense-report";
import { logger } from "@/lib/logger";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("monthly-expense-report");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await generateAndSendMonthlyExpenseReport();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Monthly expense report cron failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
