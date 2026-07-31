import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import {
  sendAppraisalDueRemindersForTomorrow,
  sendPIPCheckInDueRemindersForTomorrow,
} from "@/lib/email/hr-appraisal-pip";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("appraisal-pip-reminders");
  if (dupeCheck) return dupeCheck;

  try {
    const [appraisalOutcome, pipOutcome] = await Promise.allSettled([
      sendAppraisalDueRemindersForTomorrow(),
      sendPIPCheckInDueRemindersForTomorrow(),
    ]);

    if (appraisalOutcome.status === "rejected") {
      logger.error("appraisal-pip-reminders: appraisal reminders failed", appraisalOutcome.reason);
    }
    if (pipOutcome.status === "rejected") {
      logger.error("appraisal-pip-reminders: PIP check-in reminders failed", pipOutcome.reason);
    }

    return NextResponse.json({
      success: true,
      appraisalRemindersSent:
        appraisalOutcome.status === "fulfilled" ? appraisalOutcome.value.sent : null,
      pipCheckInRemindersSent:
        pipOutcome.status === "fulfilled" ? pipOutcome.value.sent : null,
    });
  } catch (error) {
    logger.error("appraisal-pip-reminders failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
