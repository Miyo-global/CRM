import { sendEmail } from "./email/sender";
import type { EmailOptions, EmailAttachment } from "./email/sender";
import { appUrl } from "./app-url";
import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvitationEmailTemplate,
  getWelcomeEmailTemplate,
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getWeeklyAttendanceReportTemplate,
  getMonthlyExpenseReportTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
  getOnboardingWelcomeEmailTemplate,
  getOnboardingTaskEmailTemplate,
  getOnboardingCompleteEmployeeEmailTemplate,
  getOnboardingCompleteHrEmailTemplate,
  getTicketCreatedEmailTemplate,
  getTicketReplyEmailTemplate,
  getTicketStatusEmailTemplate,
  getTaskAssignedEmailTemplate,
  getDealStageChangeEmailTemplate,
  getLeadAssignedEmailTemplate,
  getReviewAssignedEmailTemplate,
  getHelpdeskTicketEmailTemplate,
  getAssetAssignedEmailTemplate,
  getAssetAssignedHrNotificationTemplate,
  getPayrollApprovedEmailTemplate,
  getRecognitionRecipientEmailTemplate,
  getRecognitionShoutoutEmailTemplate,
} from "./email-templates";
import type { MonthlyExpenseReportRow } from "./email-templates";
import { generateMonthlyExpenseReportXlsx } from "./monthly-expense-report-xlsx";

export type { EmailOptions, EmailAttachment };

const baseUrl = appUrl;

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email - Miyo Global",
    html: getVerificationEmailTemplate(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password - Miyo Global",
    html: getPasswordResetEmailTemplate(resetUrl),
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName?: string
) {
  const invitationUrl = `${baseUrl}/invitation/${token}`;
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} - Miyo Global`,
    html: getInvitationEmailTemplate(invitationUrl, organizationName, inviterName),
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  setupUrl: string
) {
  await sendEmail({
    to: email,
    subject: "Welcome to Miyo Global — Set Up Your Account",
    html: getWelcomeEmailTemplate(name, email, setupUrl),
  });
}

export async function sendProjectAssignmentEmail(
  email: string,
  memberName: string,
  projectName: string,
  projectKey: string,
  projectId: number,
  assignedBy?: string
) {
  const projectUrl = `${baseUrl}/projects/${projectId}`;
  await sendEmail({
    to: email,
    subject: `Added to Project: ${projectName} - Miyo Global`,
    html: getProjectAssignmentEmailTemplate(memberName, projectName, projectKey, projectUrl, assignedBy),
  });
}

export async function sendTicketAssignmentEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  ticketType: string,
  ticketPriority: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  createdBy: string,
  issueKey?: string,
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  const subjectPrefix = issueKey ? `[${issueKey}] ` : "";
  await sendEmail({
    to: email,
    subject: `${subjectPrefix}${ticketTitle} - Miyo Global`,
    html: getTicketAssignmentEmailTemplate(
      assigneeName,
      ticketTitle,
      ticketType,
      ticketPriority,
      projectName,
      ticketUrl,
      createdBy,
      issueKey,
    ),
  });
}

export async function sendTicketReviewRequestEmail(
  email: string,
  reviewerName: string,
  ticketTitle: string,
  ticketType: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  completedBy: string,
  comment?: string
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Review Requested: ${ticketTitle} - Miyo Global`,
    html: getTicketReviewRequestEmailTemplate(
      reviewerName,
      ticketTitle,
      ticketType,
      projectName,
      ticketUrl,
      completedBy,
      comment
    ),
  });
}

export async function sendTicketChangesRequestedEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  reviewerName: string,
  comment?: string
) {
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  await sendEmail({
    to: email,
    subject: `Changes Requested: ${ticketTitle} - Miyo Global`,
    html: getTicketChangesRequestedEmailTemplate(
      assigneeName,
      ticketTitle,
      projectName,
      ticketUrl,
      reviewerName,
      comment
    ),
  });
}

export async function sendTicketCommentEmail(
  recipients: { email: string; name: string }[],
  commenterName: string,
  ticketTitle: string,
  projectName: string,
  projectId: number,
  ticketId: number,
  commentContent: string,
  issueKey?: string,
) {
  if (!recipients.length) return;
  const ticketUrl = `${baseUrl}/projects/${projectId}?ticket=${ticketId}`;
  const keyPrefix = issueKey ? `[${issueKey}] ` : "";
  const { getTicketCommentEmailTemplate } = await import("./email-templates");
  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `${keyPrefix}New comment on: ${ticketTitle} - Miyo Global`,
        html: getTicketCommentEmailTemplate(
          r.name,
          commenterName,
          ticketTitle,
          projectName,
          ticketUrl,
          commentContent,
          issueKey,
        ),
      }),
    ),
  );
}

export async function sendLeaveRequestEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
) {
  const leaveUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: email,
    subject: `Leave Request: ${employeeName} - Miyo Global`,
    html: getLeaveRequestEmailTemplate(
      approverName,
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason,
      leaveUrl
    ),
  });
}

export async function sendLeaveStatusUpdateEmail(
  email: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
) {
  await sendEmail({
    to: email,
    subject: `Leave Request ${status}: ${leaveType} - Miyo Global`,
    html: getLeaveStatusUpdateEmailTemplate(
      employeeName,
      leaveType,
      startDate,
      endDate,
      status,
      approverName,
      rejectionReason
    ),
  });
}

export async function sendLeaveCancellationEmail(
  email: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
) {
  await sendEmail({
    to: email,
    subject: `Leave Cancelled: ${employeeName} - Miyo Global`,
    html: getLeaveCancellationEmailTemplate(
      approverName,
      employeeName,
      leaveType,
      startDate,
      endDate
    ),
  });
}

export async function sendPasswordChangeConfirmationEmail(
  email: string,
  userName: string
) {
  await sendEmail({
    to: email,
    subject: 'Password Changed Successfully - Miyo Global',
    html: getPasswordChangeConfirmationEmailTemplate(userName),
  });
}

export async function sendAccountDeactivationEmail(
  email: string,
  employeeName: string,
  deactivatedBy: string,
  reason?: string
) {
  await sendEmail({
    to: email,
    subject: 'Account Deactivated - Miyo Global',
    html: getAccountDeactivationEmailTemplate(employeeName, deactivatedBy, reason),
  });
}

export async function sendHolidayAnnouncementEmail(
  email: string,
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  await sendEmail({
    to: email,
    subject: `Holiday Tomorrow: ${holidayName} - Miyo Global`,
    html: getHolidayAnnouncementEmailTemplate(holidayName, holidayDate, message),
  });
}

export async function sendCompanyAnnouncementEmail(
  email: string,
  subject: string,
  message: string,
  announcedBy: string
) {
  await sendEmail({
    to: email,
    subject: `Announcement: ${subject} - Miyo Global`,
    html: getCompanyAnnouncementEmailTemplate(subject, message, announcedBy),
  });
}

export async function sendBulkHolidayAnnouncement(
  emails: string[],
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  const emailPromises = emails.map(email =>
    sendHolidayAnnouncementEmail(email, holidayName, holidayDate, message)
  );

  await Promise.allSettled(emailPromises);
}

export async function sendBulkCompanyAnnouncement(
  emails: string[],
  subject: string,
  message: string,
  announcedBy: string
) {
  const emailPromises = emails.map(email =>
    sendCompanyAnnouncementEmail(email, subject, message, announcedBy)
  );

  await Promise.allSettled(emailPromises);
}

export async function sendExpenseSubmittedEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string
) {
  const expenseLink = `${baseUrl}/hr/expenses`;
  await sendEmail({
    to: approverEmail,
    subject: `New Expense Claim from ${employeeName}`,
    html: getExpenseSubmittedEmailTemplate(
      approverName,
      employeeName,
      category,
      amount,
      description,
      expenseLink
    ),
  });
}

export async function sendExpenseApprovedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Approved - ₹${amount}`,
    html: getExpenseApprovedEmailTemplate(employeeName, category, amount, approverName),
  });
}

export async function sendExpenseRejectedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string,
  reason: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Rejected - ₹${amount}`,
    html: getExpenseRejectedEmailTemplate(employeeName, category, amount, approverName, reason),
  });
}

export async function sendExpensePaidEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  transactionRef?: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Reimbursed - ₹${amount}`,
    html: getExpensePaidEmailTemplate(employeeName, category, amount, transactionRef),
  });
}

export async function sendDocumentExpiryReminderEmail(
  email: string,
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
) {
  await sendEmail({
    to: email,
    subject: `Document Expiring Soon: ${documentName}`,
    html: getDocumentExpiryReminderEmailTemplate(
      employeeName,
      documentName,
      documentType,
      expiryDate,
      daysRemaining
    ),
  });
}

export async function sendPayslipGeneratedEmail(
  email: string,
  employeeName: string,
  month: string,
  netSalary: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payslip Generated</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Miyo Global</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1e40af; margin-top: 0;">Your Payslip is Ready! 📋</h2>

        <p>Dear <strong>${employeeName}</strong>,</p>

        <p>Your payslip for <strong>${month}</strong> has been generated and is now available for viewing.</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #166534; font-size: 14px;">Net Salary</p>
          <p style="margin: 5px 0 0 0; color: #166534; font-size: 28px; font-weight: bold;">₹${netSalary}</p>
        </div>

        <p>You can view and download your detailed payslip by logging into your account and navigating to <strong>My Payslips</strong>.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/hr/my-payslips"
             style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Payslip
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions regarding your salary, please contact the HR department.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated email from Miyo Global. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Your Payslip for ${month} is Ready`,
    html,
  });
}

export async function sendWeeklyAttendanceReportEmail(
  weekRange: string,
  orgName: string,
  rows: { name: string; totalHours: string; autoCheckoutDays: number; overtimeDays: number; daysPresent: number }[],
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Weekly Attendance Report - ${weekRange}`;
  const html = getWeeklyAttendanceReportTemplate(weekRange, orgName, rows);

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
    });
  }
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

export async function sendAccountLockedEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Account Locked - Miyo Global",
    html: getAccountLockedEmailTemplate(name),
  });
}

export async function sendNewDeviceLoginEmail(
  email: string,
  name: string,
  deviceInfo: { userAgent: string; ipAddress: string; time: string }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "New Device Sign-In Detected - Miyo Global",
    html: getNewDeviceLoginEmailTemplate(name, deviceInfo),
  });
}

export async function sendPasswordExpiryWarningEmail(
  email: string,
  name: string,
  daysLeft: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Your Password Expires in ${daysLeft} Days - Miyo Global`,
    html: getPasswordExpiryWarningEmailTemplate(name, daysLeft),
  });
}


export async function sendWorkLogStatusEmail(
  email: string,
  employeeName: string,
  date: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
) {
  const html =
    status === "APPROVED"
      ? getWorkLogApprovedEmailTemplate(employeeName, date, approverName)
      : getWorkLogRejectedEmailTemplate(employeeName, date, approverName, rejectionReason);

  await sendEmail({
    to: email,
    subject: `Work Log ${status === "APPROVED" ? "Approved" : "Rejected"} — ${date}`,
    html,
  });
}


export async function sendOnboardingWelcomeEmail(
  email: string,
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: "Welcome to Miyo Global — Your Onboarding Starts Now!",
    html: getOnboardingWelcomeEmailTemplate(employeeName, designation, joiningDate, taskCount),
  });
}

export async function sendOnboardingTaskEmail(
  email: string,
  recipientName: string,
  employeeName: string,
  taskRole: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Tasks Assigned: ${employeeName}`,
    html: getOnboardingTaskEmailTemplate(recipientName, employeeName, taskRole, taskCount),
  });
}


export async function sendSupportTicketCreatedEmail(
  email: string,
  assigneeName: string,
  ticketTitle: string,
  priority: string,
  creatorName: string,
  ticketId: number
) {
  await sendEmail({
    to: email,
    subject: `Support Ticket Assigned: #${ticketId} — ${ticketTitle}`,
    html: getTicketCreatedEmailTemplate(assigneeName, ticketTitle, priority, creatorName, ticketId),
  });
}

export async function sendSupportTicketReplyEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  authorName: string,
  messagePreview: string
) {
  await sendEmail({
    to: email,
    subject: `New Reply on Ticket #${ticketId}: ${ticketTitle}`,
    html: getTicketReplyEmailTemplate(recipientName, ticketTitle, ticketId, authorName, messagePreview),
  });
}

export async function sendSupportTicketStatusEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  newStatus: string,
  updatedBy: string
) {
  await sendEmail({
    to: email,
    subject: `Ticket #${ticketId} ${newStatus}: ${ticketTitle}`,
    html: getTicketStatusEmailTemplate(recipientName, ticketTitle, ticketId, newStatus, updatedBy),
  });
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


export async function sendReviewAssignedEmail(
  email: string,
  employeeName: string,
  reviewerName: string,
  periodStart: string,
  periodEnd: string
) {
  await sendEmail({
    to: email,
    subject: "Performance Review Assigned — Miyo Global",
    html: getReviewAssignedEmailTemplate(employeeName, reviewerName, periodStart, periodEnd),
  });
}


export async function sendHelpdeskTicketEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  category: string,
  priority: string,
  creatorName: string
) {
  await sendEmail({
    to: email,
    subject: `Helpdesk Ticket: ${ticketTitle}`,
    html: getHelpdeskTicketEmailTemplate(recipientName, ticketTitle, category, priority, creatorName),
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

export async function sendPayrollApprovedEmail(
  email: string,
  employeeName: string,
  month: string,
  approverName: string
) {
  await sendEmail({
    to: email,
    subject: `Payroll Approved — ${month}`,
    html: getPayrollApprovedEmailTemplate(employeeName, month, approverName),
  });
}


export async function sendOnboardingCompleteEmployeeEmail(
  email: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: "Onboarding Complete — Welcome to the Team!",
    html: getOnboardingCompleteEmployeeEmailTemplate(employeeName),
  });
}

export async function sendOnboardingCompleteHrEmail(
  email: string,
  hrName: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Complete: ${employeeName}`,
    html: getOnboardingCompleteHrEmailTemplate(hrName, employeeName),
  });
}

export async function sendRecognitionRecipientEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  category: string,
  message: string,
  senderImageUrl: string | null
) {
  await sendEmail({
    to: recipientEmail,
    subject: `🎉 You've been recognised by ${senderName}!`,
    html: getRecognitionRecipientEmailTemplate(recipientName, senderName, category, message, senderImageUrl),
  });
}

export async function sendRecognitionShoutoutEmail(
  viewerEmail: string,
  viewerName: string,
  recipientName: string,
  recipientImageUrl: string | null,
  senderName: string,
  category: string,
  message: string
) {
  await sendEmail({
    to: viewerEmail,
    subject: `🎉 ${recipientName} just got recognised — Team Shoutout!`,
    html: getRecognitionShoutoutEmailTemplate(viewerName, recipientName, recipientImageUrl, senderName, category, message),
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
