import { sendEmail, sendTemplateEmail } from "./email/sender";
// MIYO-0159 / MIYO-0160: these two now render the hand-written templates and
// live in lib/email/auth.ts; this module re-exports them so its callers get
// the same mail.
export {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountLockedEmail,
  sendNewDeviceLoginEmail,
  sendPasswordExpiryWarningEmail,
  sendAccountDeactivationEmail,
  sendInvitationEmail,
  sendMfaEnabledEmail,
  sendMfaDisabledEmail,
  sendMfaResetByAdminEmail,
} from "./email/auth";
export { sendLeaveCancellationEmail } from "./email/hr-leaves";
export { sendWeeklyAttendanceReportEmail } from "./email/hr-reports";
export { sendPayrollApprovedEmail } from "./email/hr-payroll";
export { sendDocumentExpiryReminderEmail } from "./email/hr-documents";
export { sendHelpdeskTicketEmail } from "./email/hr-helpdesk";
export {
  sendSupportTicketCreatedEmail,
  sendSupportTicketReplyEmail,
  sendSupportTicketStatusEmail,
} from "./email/support";
export {
  sendProjectAssignmentEmail,
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
  sendTicketCommentEmail,
} from "./email/projects";
export { sendWorkLogStatusEmail } from "./email/hr-performance";
export {
  sendReviewAssignedEmail,
  sendSelfReviewReminderEmail,
  sendManagerReviewReminderEmail,
  sendReviewPublishedEmail,
  sendGoalSettingReminderEmail,
  sendUnsatisfactoryPerformanceNoticeEmail,
} from "./email/hr-performance";
export {
  sendRecognitionRecipientEmail,
  sendRecognitionShoutoutEmail,
  sendResignationSubmittedEmail,
  sendResignationApprovedEmail,
  sendTerminationEmail,
} from "./email/hr-employees";
export {
  sendExpenseSubmittedEmail,
  sendExpenseApprovedEmail,
  sendExpenseRejectedEmail,
  sendExpensePaidEmail,
} from "./email/hr-expenses";
export {
  sendOnboardingWelcomeEmail,
  sendOnboardingTaskEmail,
  sendOnboardingCompleteEmployeeEmail,
  sendOnboardingCompleteHrEmail,
} from "./email/onboarding";
// MIYO-0166: the holiday reminder renders its template in lib/email/announcements.ts.
export {
  sendHolidayAnnouncementEmail,
  sendBulkHolidayAnnouncement,
} from "./email/announcements";
import type { EmailOptions, EmailAttachment } from "./email/sender";
import { appUrl } from "./app-url";
import {
  getVerificationEmailTemplate,
  getMonthlyExpenseReportTemplate,
  getTaskAssignedEmailTemplate,
  getDealStageChangeEmailTemplate,
  getLeadAssignedEmailTemplate,
  getAssetAssignedEmailTemplate,
  getAssetAssignedHrNotificationTemplate,
} from "./email-templates";
import type { MonthlyExpenseReportRow } from "./email-templates";
import { generateMonthlyExpenseReportXlsx } from "./monthly-expense-report-xlsx";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export type { EmailOptions, EmailAttachment };

/** "20 Apr 2026" for one day, "20–22 Apr 2026" for a range. */
function dateRangeLabel(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}

const baseUrl = appUrl;

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email",
    html: getVerificationEmailTemplate(verificationUrl),
  });
}






/**
 * MIYO-0161: the leave-request-approver template. The subject no longer
 * carries the org-name suffix, and the mail states the day count and the
 * balance the approval would leave.
 */
export async function sendLeaveRequestEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
  extra: { dayCount?: number; balanceAfter?: number | null; leaveId?: number } = {},
) {
  await sendTemplateEmail("leave-request-approver", {
    to: email,
    category: "leaves",
    vars: {
      employee_name: employeeName,
      approver_name: approverName,
      leave_type: leaveType,
      date_range: dateRangeLabel(startDate, endDate),
      day_count: extra.dayCount ?? "",
      balance_after: extra.balanceAfter ?? "Not applicable",
      reason: reason || "None given",
      leave_id: extra.leaveId ?? "",
    },
  });
}

/**
 * MIYO-0162 / MIYO-0163: one template per outcome, leave-approved and
 * leave-rejected, instead of one body with emoji branches.
 */
export async function sendLeaveStatusUpdateEmail(
  email: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string,
  balanceAfter?: number | null,
  dayCount?: number,
) {
  const dateRange = dateRangeLabel(startDate, endDate);

  if (status === "APPROVED") {
    await sendTemplateEmail("leave-approved", {
      to: email,
      category: "leaves",
      vars: {
        approver_name: approverName,
        leave_type: leaveType,
        date_range: dateRange,
        day_count: dayCount ?? "",
        balance_after: balanceAfter ?? "Not applicable",
      },
    });
    return;
  }

  await sendTemplateEmail("leave-rejected", {
    to: email,
    category: "leaves",
    vars: {
      approver_name: approverName,
      leave_type: leaveType,
      date_range: dateRange,
      rejection_reason: rejectionReason?.trim() || "No note was added.",
    },
  });
}

/**
 * MIYO-0165: the celebration-birthday and celebration-work-anniversary
 * templates. The old body hard-coded "Miyo Global" and suffixed the subject
 * with it; both now come from {{org_name}} (A34).
 */
export async function sendCelebrationEmail(
  email: string,
  name: string,
  kind: "birthday" | "anniversary",
  yearsCompleted?: number,
  joiningDate?: string | null,
) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  if (kind === "birthday") {
    await sendTemplateEmail("celebration-birthday", {
      to: email,
      category: "hr",
      vars: { first_name: firstName },
    });
    return;
  }

  const years = yearsCompleted ?? 1;
  await sendTemplateEmail("celebration-work-anniversary", {
    to: email,
    category: "hr",
    vars: {
      first_name: firstName,
      years,
      years_word: years === 1 ? "year" : "years",
      joining_date: joiningDate ?? "your first day",
    },
  });
}






export async function sendMonthlyExpenseReportEmail(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: { totalAmount: string; totalCount: number; pendingCount: number; approvedCount: number; paidCount: number; rejectedCount: number },
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Monthly Expense Report - ${monthLabel}`;
  const html = getMonthlyExpenseReportTemplate(monthLabel, orgName, rows, summary);
  const xlsxBuffer = await generateMonthlyExpenseReportXlsx(monthLabel, orgName, rows, summary);
  const safeMonthLabel = monthLabel.replace(/\s+/g, "-");
  const xlsxFilename = `Monthly-Expense-Report-${safeMonthLabel}.xlsx`;

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
      attachments: [
        {
          filename: xlsxFilename,
          content: xlsxBuffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }
}










export async function sendTaskAssignedEmail(
  email: string,
  assigneeName: string,
  taskTitle: string,
  taskType: string,
  dueDate: string | null,
  creatorName: string,
  entityLabel?: string
) {
  await sendEmail({
    to: email,
    subject: `Task Assigned: ${taskTitle}`,
    html: getTaskAssignedEmailTemplate(assigneeName, taskTitle, taskType, dueDate, creatorName, entityLabel),
  });
}


export async function sendDealStageChangeEmail(
  email: string,
  recipientName: string,
  dealName: string,
  previousStage: string,
  newStage: string,
  dealValue: string | null,
  changedBy: string,
  dealId: number
) {
  await sendEmail({
    to: email,
    subject: `Deal ${newStage === "WON" ? "Won" : newStage === "LOST" ? "Lost" : "Updated"}: ${dealName}`,
    html: getDealStageChangeEmailTemplate(recipientName, dealName, previousStage, newStage, dealValue, changedBy, dealId),
  });
}


export async function sendLeadAssignedEmail(
  email: string,
  repName: string,
  leadName: string,
  source: string,
  priority: string,
  assignedBy: string
) {
  await sendEmail({
    to: email,
    subject: `New Lead Assigned: ${leadName}`,
    html: getLeadAssignedEmailTemplate(repName, leadName, source, priority, assignedBy),
  });
}






export async function sendAssetAssignedEmail(
  email: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null
) {
  await sendEmail({
    to: email,
    subject: `Asset Assigned: ${assetName}`,
    html: getAssetAssignedEmailTemplate(employeeName, assetName, assetType, serialNumber),
  });
}


export async function sendAssetAssignedHrEmail(
  hrEmail: string,
  hrName: string,
  assignerName: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null,
  assignedAt: string
) {
  await sendEmail({
    to: hrEmail,
    subject: `Asset Assigned: ${assetName} → ${employeeName}`,
    html: getAssetAssignedHrNotificationTemplate(
      hrName,
      assignerName,
      employeeName,
      assetName,
      assetType,
      serialNumber,
      assignedAt,
    ),
  });
}





export async function sendCandidateStageEmail(
  candidateEmail: string,
  stage: string,
  params: {
    candidateName: string;
    jobTitle: string;
    roundName?: string;
    roundNumber?: number;
    durationMinutes?: number;
    mode?: string;
    companyName?: string;
    attendedInterview?: boolean;
  },
) {
  const {
    getCandidateShortlistedEmail,
    getCandidateInterviewInviteEmail,
    getCandidateOfferEmail,
  } = await import("./email-templates/hr-recruitment");
  const { getCandidateRejectionEmail } = await import("./email-templates/hr");
  const { HR_NOTIFICATION_EMAIL } = await import("./constants/hr-leave-routing");

  let emailPayload: { subject: string; html: string } | null = null;

  if (stage === "SCREENING" || stage === "SHORTLISTED") {
    emailPayload = getCandidateShortlistedEmail({
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
    });
  } else if (stage.startsWith("ROUND_") && params.roundName && params.roundNumber) {
    emailPayload = getCandidateInterviewInviteEmail({
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      roundName: params.roundName,
      roundNumber: params.roundNumber,
      durationMinutes: params.durationMinutes ?? 60,
      mode: params.mode ?? "VIDEO",
    });
  } else if (stage === "OFFER") {
    emailPayload = getCandidateOfferEmail({
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
    });
  } else if (stage === "REJECTED") {
    emailPayload = getCandidateRejectionEmail({
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      companyName: params.companyName ?? "Miyo Global",
      attendedInterview: params.attendedInterview,
    });
  }

  if (emailPayload) {
    await sendEmail({ to: candidateEmail, bcc: HR_NOTIFICATION_EMAIL, ...emailPayload });
  }
}

export { sendEmail };
