import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { seedAnniversaryAppraisalCycles } from "@/server/actions/appraisal-cycle-seed";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("appraisal-cycle-seed");
  if (dupeCheck) return dupeCheck;

  try {
    const result = await seedAnniversaryAppraisalCycles();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("appraisal-cycle-seed failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
