import { sendEmail } from "./sender";
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
    subject: `Resignation Submitted: ${employeeName} - Miyo Global`,
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
    subject: `Resignation Accepted - Miyo Global`,
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
    subject: `Employment Termination Notice - Miyo Global`,
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
