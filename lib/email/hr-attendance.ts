import { sendTemplateEmail } from "./sender";

/**
 * MIYO-0241: the hand-written attendance-holiday-work-decision template.
 *
 * Approving or rejecting a holiday-work request only wrote an in-app
 * notification, so someone who had asked to work a holiday found out by
 * opening the CRM.
 */
export async function sendHolidayWorkDecisionEmail(
  email: string,
  decision: "approved" | "rejected",
  details: { date: string; compensation: string; note?: string | null },
): Promise<void> {
  await sendTemplateEmail("attendance-holiday-work-decision", {
    to: email,
    category: "attendance",
    vars: {
      decision,
      date: details.date,
      compensation: details.compensation,
      note: details.note?.trim() || "none",
    },
  });
}
