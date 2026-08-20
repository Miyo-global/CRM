import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

import {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "@/lib/email-templates/auth";

import {
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getDocumentExpiryReminderEmailTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
} from "@/lib/email-templates/hr";

import {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
} from "@/lib/email-templates/expense";

import {
  getSelfReviewReminderEmail,
  getManagerReviewReminderEmail,
  getReviewPublishedEmail,
  getGoalSettingReminderEmail,
  getUnsatisfactoryPerformanceNoticeEmail,
} from "@/lib/email-templates/appraisal";

import {
  getLeadWelcomeEmail,
  getFollowUpReminderEmail,
  getDealWonEmail,
  getSlaBreachAlertEmail,
  getClientOnboardingEmail,
} from "@/lib/email-templates/crm";

import {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
} from "@/lib/email-templates/project";

import {
  getInvitationEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "@/lib/email-templates/organization";
import { CRM_BASE_URL } from "@/lib/constants/company";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const BASE_URL = process.env.NEXTAUTH_URL || CRM_BASE_URL;

interface TemplateEntry {
  subject: string;
  generateHtml: () => string;
}

const TEMPLATE_MAP: Record<string, TemplateEntry> = {
  "auth.verify": {
    subject: "Verify Your Email Address - Miyo Global",
    generateHtml: () => getVerificationEmailTemplate(`${BASE_URL}/verify-email?token=test-token`),
  },
  "auth.password_reset": {
    subject: "Reset Your Password - Miyo Global",
    generateHtml: () => getPasswordResetEmailTemplate(`${BASE_URL}/reset-password?token=test-token`),
  },
  "auth.welcome": {
    subject: "Welcome to Miyo Global — Set Up Your Account",
    generateHtml: () =>
      getWelcomeEmailTemplate("Test User", "test@example.com", `${BASE_URL}/setup-password?token=test-token`),
  },
  "auth.password_changed": {
    subject: "Password Changed Successfully - Miyo Global",
    generateHtml: () => getPasswordChangeConfirmationEmailTemplate("Test User"),
  },
  "auth.account_deactivated": {
    subject: "Account Deactivated - Miyo Global",
    generateHtml: () =>
      getAccountDeactivationEmailTemplate("Test User", "HR Admin", "Test deactivation"),
  },
  "auth.account_locked": {
    subject: "Account Locked - Miyo Global",
    generateHtml: () => getAccountLockedEmailTemplate("Test User"),
  },
  "auth.new_device": {
    subject: "New Device Sign-In Detected - Miyo Global",
    generateHtml: () =>
      getNewDeviceLoginEmailTemplate("Test User", {
        userAgent: "Chrome on Windows",
        ipAddress: "127.0.0.1",
        time: new Date().toLocaleString(DEFAULT_LOCALE),
      }),
  },
  "auth.password_expiry": {
    subject: "Your Password Expires in 7 Days - Miyo Global",
    generateHtml: () => getPasswordExpiryWarningEmailTemplate("Test User", 7),
  },

  "org.invitation": {
    subject: "Invitation to join Miyo Global",
    generateHtml: () =>
      getInvitationEmailTemplate(`${BASE_URL}/invitation/tok123`, "Miyo Global", "HR Admin"),
  },
  "org.holiday": {
    subject: "Holiday Tomorrow: Test Holiday - Miyo Global",
    generateHtml: () =>
      getHolidayAnnouncementEmailTemplate("Test Holiday", "Tomorrow", "Enjoy the holiday!"),
  },
  "org.announcement": {
    subject: "Announcement: Test Announcement - Miyo Global",
    generateHtml: () =>
      getCompanyAnnouncementEmailTemplate(
        "Test Announcement",
        "This is a test company announcement.",
        "HR Admin"
      ),
  },

  "hr.leave_request": {
    subject: "Leave Request: Test Employee - Miyo Global",
    generateHtml: () =>
      getLeaveRequestEmailTemplate(
        "HR Admin",
        "Test Employee",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "Personal work.",
        `${BASE_URL}/hr/leaves`
      ),
  },
  "hr.leave_approved": {
    subject: "Leave Request APPROVED: Casual Leave - Miyo Global",
    generateHtml: () =>
      getLeaveStatusUpdateEmailTemplate(
        "Test Employee",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "APPROVED",
        "HR Admin"
      ),
  },
  "hr.leave_rejected": {
    subject: "Leave Request REJECTED: Casual Leave - Miyo Global",
    generateHtml: () =>
      getLeaveStatusUpdateEmailTemplate(
        "Test Employee",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "REJECTED",
        "HR Admin",
        "Insufficient leave balance."
      ),
  },
  "hr.leave_cancelled": {
    subject: "Leave Cancelled: Test Employee - Miyo Global",
    generateHtml: () =>
      getLeaveCancellationEmailTemplate(
        "HR Admin",
        "Test Employee",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026"
      ),
  },
  "hr.doc_expiry": {
    subject: "Document Expiring Soon: Test Document",
    generateHtml: () =>
      getDocumentExpiryReminderEmailTemplate(
        "Test Employee",
        "Test Document",
        "Identity",
        "30 Apr 2026",
        12
      ),
  },
  "hr.resignation_submitted": {
    subject: "Resignation Submitted: Test Employee - Miyo Global",
    generateHtml: () =>
      getResignationSubmittedEmailTemplate(
        "HR Admin",
        "Test Employee",
        "Associate",
        "12 Apr 2026",
        "12 May 2026",
        30,
        "Pursuing higher studies.",
        `${BASE_URL}/hr/exit`
      ),
  },
  "hr.resignation_approved": {
    subject: "Resignation Accepted - Miyo Global",
    generateHtml: () =>
      getResignationApprovedEmailTemplate(
        "Test Employee",
        "HR Admin",
        "12 May 2026",
        30,
        "12 Apr 2026",
        `${BASE_URL}/hr/exit`
      ),
  },

  "expense.submitted": {
    subject: "New Expense Claim from Test Employee",
    generateHtml: () =>
      getExpenseSubmittedEmailTemplate(
        "HR Admin",
        "Test Employee",
        "Travel",
        "1,500",
        "Test expense",
        `${BASE_URL}/hr/expenses`
      ),
  },
  "expense.approved": {
    subject: "Expense Claim Approved - ₹1,500",
    generateHtml: () =>
      getExpenseApprovedEmailTemplate("Test Employee", "Travel", "1,500", "HR Admin"),
  },
  "expense.rejected": {
    subject: "Expense Claim Rejected - ₹1,500",
    generateHtml: () =>
      getExpenseRejectedEmailTemplate(
        "Test Employee",
        "Travel",
        "1,500",
        "HR Admin",
        "Receipt not attached."
      ),
  },
  "expense.paid": {
    subject: "Expense Reimbursed - ₹1,500",
    generateHtml: () =>
      getExpensePaidEmailTemplate("Test Employee", "Travel", "1,500", "TXN-TEST-001"),
  },

  "appraisal.self_review": {
    subject: "Self-Review Due: Q1 FY2026 Performance Review",
    generateHtml: () =>
      getSelfReviewReminderEmail(
        "Test Employee",
        "Q1 FY2026 Performance Review",
        "30 Apr 2026",
        `${BASE_URL}/hr/appraisals/review`
      ),
  },
  "appraisal.manager_review": {
    subject: "3 Pending Reviews — Q1 FY2026 Performance Review",
    generateHtml: () =>
      getManagerReviewReminderEmail(
        "HR Admin",
        3,
        "Q1 FY2026 Performance Review",
        `${BASE_URL}/hr/appraisals`
      ),
  },
  "appraisal.published": {
    subject: "Your Q1 FY2026 Review is Published",
    generateHtml: () =>
      getReviewPublishedEmail(
        "Test Employee",
        "Q1 FY2026 Performance Review",
        "4.0 / 5 — Meets Expectations",
        `${BASE_URL}/hr/appraisals/result`
      ),
  },
  "appraisal.goal_setting": {
    subject: "Set Your Q2 FY2026 Goals",
    generateHtml: () =>
      getGoalSettingReminderEmail(
        "Test Employee",
        "Q2 FY2026",
        "15 May 2026",
        `${BASE_URL}/hr/appraisals/goals`
      ),
  },
  "appraisal.unsatisfactory_performance_notice": {
    subject: "Notice Regarding Unsatisfactory Performance",
    generateHtml: () =>
      getUnsatisfactoryPerformanceNoticeEmail(
        "Test Employee",
        "17th February",
        "17th April",
        "the assigned sales expectations",
        "₹7,000"
      ),
  },

  "crm.lead_welcome": {
    subject: "Thank you for contacting Miyo Global",
    generateHtml: () =>
      getLeadWelcomeEmail(
        "Test Lead",
        "Miyo Global",
        "info@miyoglobal.com",
        BASE_URL
      ),
  },
  "crm.follow_up": {
    subject: "Follow up with Test Lead",
    generateHtml: () =>
      getFollowUpReminderEmail("Test Rep", "Test Lead", 7, `${BASE_URL}/crm/leads/1`),
  },
  "crm.deal_won": {
    subject: "Deal Won: Test Deal — ₹10,00,000",
    generateHtml: () =>
      getDealWonEmail("Team", "Test Deal", "₹10,00,000", "Test Rep", `${BASE_URL}/crm/deals`),
  },
  "crm.sla_breach": {
    subject: "SLA Breach: Test Lead",
    generateHtml: () =>
      getSlaBreachAlertEmail("Test Rep", "Test Lead", 4, `${BASE_URL}/crm/leads/1`),
  },
  "crm.client_onboarding": {
    subject: "Welcome to Miyo Global",
    generateHtml: () =>
      getClientOnboardingEmail(
        "Test Client",
        "Miyo Global",
        "Test Rep",
        `${BASE_URL}/client-portal`
      ),
  },

  "project.assigned": {
    subject: "Added to Project: Test Project - Miyo Global",
    generateHtml: () =>
      getProjectAssignmentEmailTemplate(
        "Test Employee",
        "Test Project",
        "TST-001",
        `${BASE_URL}/projects/1`,
        "HR Admin"
      ),
  },
  "project.ticket_assigned": {
    subject: "Ticket Assigned: Test ticket - Miyo Global",
    generateHtml: () =>
      getTicketAssignmentEmailTemplate(
        "Test Employee",
        "Test ticket",
        "BUG",
        "MEDIUM",
        "Test Project",
        `${BASE_URL}/projects/1?ticket=1`,
        "HR Admin"
      ),
  },
  "project.review_request": {
    subject: "Review Requested: Test ticket - Miyo Global",
    generateHtml: () =>
      getTicketReviewRequestEmailTemplate(
        "HR Admin",
        "Test ticket",
        "BUG",
        "Test Project",
        `${BASE_URL}/projects/1?ticket=1`,
        "Test Employee",
        "Please review my changes."
      ),
  },
  "project.changes_requested": {
    subject: "Changes Requested: Test ticket - Miyo Global",
    generateHtml: () =>
      getTicketChangesRequestedEmailTemplate(
        "Test Employee",
        "Test ticket",
        "Test Project",
        `${BASE_URL}/projects/1?ticket=1`,
        "HR Admin",
        "Please fix the edge case on mobile."
      ),
  },
};

const bodySchema = z.object({
  templateId: z.string().min(1),
  testEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    body = bodySchema.parse(raw);
  } catch {
    return err("Invalid request body — expected { templateId, testEmail }", 400);
  }

  return withAdmin(async (session) => {
    if (body.testEmail.toLowerCase() !== (session.user.email ?? "").toLowerCase()) {
      return err("Test emails can only be sent to your own account email.", 403);
    }

    const entry = TEMPLATE_MAP[body.templateId];
    if (!entry) {
      return err(`Unknown template ID: ${body.templateId}`, 404);
    }

    let html: string;
    try {
      html = entry.generateHtml();
    } catch {
      return err("Failed to generate template", 500);
    }

    await sendEmail({ to: body.testEmail, subject: `[TEST] ${entry.subject}`, html });

    return ok({ sent: true, to: body.testEmail, templateId: body.templateId });
  });
}
