import { sendEmail, sendTemplateEmail } from "./sender";
import type { EmailAttachment } from "./sender";
import { baseUrl } from "./sender";
import {
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
} from "../email-templates";

export async function sendResignationSubmittedEmail(
  hrEmail: string,
  hrName: string,
  employeeName: string,
  employeeDesignation: string,
  submissionDate: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  reason: string
) {
  const reviewUrl = `${baseUrl}/hr/exit`;
  await sendEmail({
    to: hrEmail,
    subject: `Resignation Submitted: ${employeeName}`,
    html: getResignationSubmittedEmailTemplate(
      hrName,
      employeeName,
      employeeDesignation,
      submissionDate,
      lastWorkingDate,
      noticePeriodDays,
      reason,
      reviewUrl
    ),
  });
}

export async function sendResignationApprovedEmail(
  employeeEmail: string,
  employeeName: string,
  approverName: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  submissionDate: string
) {
  const portalUrl = `${baseUrl}/hr/exit`;
  await sendEmail({
    to: employeeEmail,
    subject: `Resignation Accepted`,
    html: getResignationApprovedEmailTemplate(
      employeeName,
      approverName,
      lastWorkingDate,
      noticePeriodDays,
      submissionDate,
      portalUrl
    ),
  });
}

export async function sendTerminationEmail(
  employeeEmail: string,
  employeeName: string,
  employeeDesignation: string,
  terminationDate: string,
  terminatedBy: string,
  reason: string,
  attachments?: EmailAttachment[]
) {
  const hrContactEmail = "hr@miyoglobal.com";
  await sendEmail({
    to: employeeEmail,
    subject: `Employment Termination Notice`,
    html: getTerminationEmailTemplate(
      employeeName,
      employeeDesignation,
      terminationDate,
      terminatedBy,
      reason,
      hrContactEmail
    ),
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
