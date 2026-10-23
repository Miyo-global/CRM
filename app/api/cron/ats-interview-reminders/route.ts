import { NextRequest, NextResponse } from "next/server";

import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { runInterviewReminders } from "@/lib/ats/interview-reminders";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/**
 * MIYO-0657, MIYO-0659: Inngest is not connected on production, so the
 * reminder clock is a cron in vercel.json; remindersSent on the row keeps
 * each mail to one send however often this runs. It runs daily (08:00 IST):
 * the Vercel Hobby plan refuses any cron more frequent than once a day, and
 * an hourly schedule failed every deploy. The 24-hour candidate reminder and
 * feedback nudges still go out; the 1-hour interviewer reminder needs an
 * hourly run again (Pro plan or Inngest).
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  if (!ATS_MODULE_ENABLED) return NextResponse.json({ success: true, skipped: "ats off" });
  const dupeCheck = await cronIdempotencyCheck("ats-interview-reminders", 5 * 60_000);
  if (dupeCheck) return dupeCheck;

  try {
    const result = await runInterviewReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("ATS interview reminders cron failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
