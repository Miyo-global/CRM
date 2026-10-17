import { sendTemplateEmail } from "./sender";
import type { EmailAttachment } from "./sender";
import { HR_EMAIL } from "@/lib/constants/company";

/**
 * MIYO-0256: company policy settles the full and final by the end of the
 * month someone leaves in, which is what the termination letter says too.
 */
function endOfMonthLabel(date: Date): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return last.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** MIYO-0254: the hand-written exit-resignation-submitted template. */
export async function sendResignationSubmittedEmail(
  hrEmail: string | string[],
  resignation: {
    employeeName: string;
    employeeCode?: string | null;
    department?: string | null;
    lastWorkingDay: string;
    noticePeriodDays: number;
    reason: string;
    resignationId: number | string;
  },
) {
  await sendTemplateEmail("exit-resignation-submitted", {
    to: hrEmail,
    category: "hr",
    vars: {
      employee_name: resignation.employeeName,
      employee_code: resignation.employeeCode ?? "not set",
      department: resignation.department ?? "not set",
      last_working_day: resignation.lastWorkingDay,
      notice_days: resignation.noticePeriodDays,
      reason: resignation.reason?.trim() || "none given",
      resignation_id: resignation.resignationId,
    },
  });
}

/** MIYO-0255: the hand-written exit-resignation-accepted template. */
export async function sendResignationApprovedEmail(
  employeeEmail: string,
  lastWorkingDay: Date,
) {
  await sendTemplateEmail("exit-resignation-accepted", {
    to: employeeEmail,
    category: "hr",
    vars: {
      last_working_day: lastWorkingDay.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      fnf_date: endOfMonthLabel(lastWorkingDay),
    },
  });
}

/** MIYO-0256: the hand-written exit-termination-notice template. */
export async function sendTerminationEmail(
  employeeEmail: string,
  employeeName: string,
  effectiveDate: Date,
  hrSignatory: string,
  attachments?: EmailAttachment[],
) {
  await sendTemplateEmail("exit-termination-notice", {
    to: employeeEmail,
    vars: {
      employee_name: employeeName,
      effective_date: effectiveDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      fnf_date: endOfMonthLabel(effectiveDate),
      hr_signatory: hrSignatory,
      hr_contact_name: hrSignatory,
      hr_email: HR_EMAIL,
    },
    attachments,
  });
}

/** First 90 characters of the message, for the preheader line. */
function snippet(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
}

/** MIYO-0245: the hand-written recognition-recipient template. */
export async function sendRecognitionRecipientEmail(
  recipientEmail: string,
  giverName: string,
  valueTag: string,
  message: string,
): Promise<void> {
  await sendTemplateEmail("recognition-recipient", {
    to: recipientEmail,
    category: "hr",
    vars: {
      giver_name: giverName,
      value_tag: valueTag,
      message,
      message_snippet: snippet(message),
    },
  });
}

/** MIYO-0246: the hand-written recognition-shoutout template. */
export async function sendRecognitionShoutoutEmail(
  viewerEmail: string | string[],
  recipientName: string,
  giverName: string,
  message: string,
): Promise<void> {
  await sendTemplateEmail("recognition-shoutout", {
    to: viewerEmail,
    category: "hr",
    vars: {
      recipient_name: recipientName,
      giver_name: giverName,
      message,
      message_snippet: snippet(message),
    },
  });
}
