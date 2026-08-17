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

import type { EmailTemplateConfig } from "./types";
import { CRM_BASE_URL } from "@/lib/constants/company";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

export const BASE_URL = CRM_BASE_URL;

export const TEMPLATE_REGISTRY: EmailTemplateConfig[] = [
  {
    id: "auth.verify",
    category: "Auth",
    name: "Email Verification",
    generate: () => ({
      subject: "Verify Your Email Address - Miyo Global",
      html: getVerificationEmailTemplate(`${BASE_URL}/verify-email?token=abc123`),
    }),
  },
  {
    id: "auth.password_reset",
    category: "Auth",
    name: "Password Reset",
    generate: () => ({
      subject: "Reset Your Password - Miyo Global",
      html: getPasswordResetEmailTemplate(`${BASE_URL}/reset-password?token=abc123`),
    }),
  },
  {
    id: "auth.welcome",
    category: "Auth",
    name: "Welcome / Account Created",
    generate: () => ({
      subject: "Welcome to Miyo Global — Set Up Your Account",
      html: getWelcomeEmailTemplate(
        "Priya Sharma",
        "priya@example.com",
        `${BASE_URL}/setup-password?token=sample-token`
      ),
    }),
  },
  {
    id: "auth.password_changed",
    category: "Auth",
    name: "Password Changed Confirmation",
    generate: () => ({
      subject: "Password Changed Successfully - Miyo Global",
      html: getPasswordChangeConfirmationEmailTemplate("Priya Sharma"),
    }),
  },
  {
    id: "auth.account_deactivated",
    category: "Auth",
    name: "Account Deactivated",
    generate: () => ({
      subject: "Account Deactivated - Miyo Global",
      html: getAccountDeactivationEmailTemplate("Rohan Mehta", "Anita HR", "Resigned from company"),
    }),
  },
  {
    id: "auth.account_locked",
    category: "Auth",
    name: "Account Locked",
    generate: () => ({
      subject: "Account Locked - Miyo Global",
      html: getAccountLockedEmailTemplate("Rohan Mehta"),
    }),
  },
  {
    id: "auth.new_device",
    category: "Auth",
    name: "New Device Login Alert",
    generate: () => ({
      subject: "New Device Sign-In Detected - Miyo Global",
      html: getNewDeviceLoginEmailTemplate("Priya Sharma", {
        userAgent: "Chrome 123 on Windows 11",
        ipAddress: "103.45.67.89",
        time: new Date().toLocaleString(DEFAULT_LOCALE),
      }),
    }),
  },
  {
    id: "auth.password_expiry",
    category: "Auth",
    name: "Password Expiry Warning",
    generate: () => ({
      subject: "Your Password Expires in 7 Days - Miyo Global",
      html: getPasswordExpiryWarningEmailTemplate("Priya Sharma", 7),
    }),
  },

  {
    id: "org.invitation",
    category: "Organization",
    name: "Team Invitation",
    generate: () => ({
      subject: "Invitation to join Miyo Global",
      html: getInvitationEmailTemplate(
        `${BASE_URL}/invitation/tok123`,
        "Miyo Global",
        "Anita HR"
      ),
    }),
  },
  {
    id: "org.holiday",
    category: "Organization",
    name: "Holiday Announcement",
    generate: () => ({
      subject: "Holiday Tomorrow: Diwali - Miyo Global",
      html: getHolidayAnnouncementEmailTemplate(
        "Diwali",
        "2 Nov 2026",
        "Wishing everyone a joyful and bright Diwali! Office will remain closed."
      ),
    }),
  },
  {
    id: "org.announcement",
    category: "Organization",
    name: "Company Announcement",
    generate: () => ({
      subject: "Announcement: Q3 All-Hands Meeting - Miyo Global",
      html: getCompanyAnnouncementEmailTemplate(
        "Q3 All-Hands Meeting",
        "We are holding our Q3 All-Hands meeting on Friday at 4 PM IST. Please make sure to attend.",
        "Rahul Miyo Global"
      ),
    }),
  },

  {
    id: "hr.leave_request",
    category: "HR Leave",
    name: "Leave Request (to approver)",
    generate: () => ({
      subject: "Leave Request: Rohan Mehta - Miyo Global",
      html: getLeaveRequestEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "Personal work — family function.",
        `${BASE_URL}/hr/leaves`
      ),
    }),
  },
  {
    id: "hr.leave_approved",
    category: "HR Leave",
    name: "Leave Approved",
    generate: () => ({
      subject: "Leave Request APPROVED: Casual Leave - Miyo Global",
      html: getLeaveStatusUpdateEmailTemplate(
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "APPROVED",
        "Anita HR"
      ),
    }),
  },
  {
    id: "hr.leave_rejected",
    category: "HR Leave",
    name: "Leave Rejected",
    generate: () => ({
      subject: "Leave Request REJECTED: Casual Leave - Miyo Global",
      html: getLeaveStatusUpdateEmailTemplate(
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026",
        "REJECTED",
        "Anita HR",
        "Insufficient leave balance for this period."
      ),
    }),
  },
  {
    id: "hr.leave_cancelled",
    category: "HR Leave",
    name: "Leave Cancellation",
    generate: () => ({
      subject: "Leave Cancelled: Rohan Mehta - Miyo Global",
      html: getLeaveCancellationEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Casual Leave",
        "20 Apr 2026",
        "22 Apr 2026"
      ),
    }),
  },
  {
    id: "hr.doc_expiry",
    category: "HR Leave",
    name: "Document Expiry Reminder",
    generate: () => ({
      subject: "Document Expiring Soon: Aadhaar Card",
      html: getDocumentExpiryReminderEmailTemplate(
        "Rohan Mehta",
        "Aadhaar Card",
        "Identity Document",
        "30 Apr 2026",
        12
      ),
    }),
  },
  {
    id: "hr.resignation_submitted",
    category: "HR Leave",
    name: "Resignation Submitted",
    generate: () => ({
      subject: "Resignation Submitted: Rohan Mehta - Miyo Global",
      html: getResignationSubmittedEmailTemplate(
        "Anita HR",
        "Rohan Mehta",
        "Senior Associate",
        "12 Apr 2026",
        "12 May 2026",
        30,
        "Pursuing higher education abroad.",
        `${BASE_URL}/hr/exit`
      ),
    }),
  },
  {
    id: "hr.resignation_approved",
    category: "HR Leave",
    name: "Resignation Accepted",
    generate: () => ({
      subject: "Resignation Accepted - Miyo Global",
      html: getResignationApprovedEmailTemplate(
        "Rohan Mehta",
        "Rahul Miyo Global",
        "12 May 2026",
        30,
        "12 Apr 2026",
        `${BASE_URL}/hr/exit`
      ),
    }),
  },

  {
    id: "expense.submitted",
    category: "HR Expense",
    name: "Expense Submitted",
    generate: () => ({
      subject: "New Expense Claim from Priya Sharma",
      html: getExpenseSubmittedEmailTemplate(
        "Anita HR",
        "Priya Sharma",
        "Travel",
        "4,500",
        "Cab to client site — Mumbai Airport to BKC",
        `${BASE_URL}/hr/expenses`
      ),
    }),
  },
  {
    id: "expense.approved",
    category: "HR Expense",
    name: "Expense Approved",
    generate: () => ({
      subject: "Expense Claim Approved - ₹4,500",
      html: getExpenseApprovedEmailTemplate("Priya Sharma", "Travel", "4,500", "Anita HR"),
    }),
  },
  {
    id: "expense.rejected",
    category: "HR Expense",
    name: "Expense Rejected",
    generate: () => ({
      subject: "Expense Claim Rejected - ₹4,500",
      html: getExpenseRejectedEmailTemplate(
        "Priya Sharma",
        "Travel",
        "4,500",
        "Anita HR",
        "Receipt not attached. Please resubmit with a valid receipt."
      ),
    }),
  },
  {
    id: "expense.paid",
    category: "HR Expense",
    name: "Expense Reimbursed",
    generate: () => ({
      subject: "Expense Reimbursed - ₹4,500",
      html: getExpensePaidEmailTemplate("Priya Sharma", "Travel", "4,500", "TXN-2026-04-45821"),
    }),
  },

  {
    id: "appraisal.self_review",
    category: "Appraisal",
    name: "Self-Review Reminder",
    generate: () => ({
      subject: "Self-Review Due: Q1 FY2026 Performance Review",
      html: getSelfReviewReminderEmail(
        "Priya Sharma",
        "Q1 FY2026 Performance Review",
        "30 Apr 2026",
        `${BASE_URL}/hr/appraisals/review`
      ),
    }),
  },
  {
    id: "appraisal.manager_review",
    category: "Appraisal",
    name: "Manager Review Reminder",
    generate: () => ({
      subject: "3 Pending Reviews — Q1 FY2026 Performance Review",
      html: getManagerReviewReminderEmail(
        "Anita HR",
        3,
        "Q1 FY2026 Performance Review",
        `${BASE_URL}/hr/appraisals`
      ),
    }),
  },
  {
    id: "appraisal.published",
    category: "Appraisal",
    name: "Review Published",
    generate: () => ({
      subject: "Your Q1 FY2026 Review is Published",
      html: getReviewPublishedEmail(
        "Priya Sharma",
        "Q1 FY2026 Performance Review",
        "4.2 / 5 — Exceeds Expectations",
        `${BASE_URL}/hr/appraisals/result`
      ),
    }),
  },
  {
    id: "appraisal.goal_setting",
    category: "Appraisal",
    name: "Goal Setting Reminder",
    generate: () => ({
      subject: "Set Your Q2 FY2026 Goals",
      html: getGoalSettingReminderEmail(
        "Priya Sharma",
        "Q2 FY2026",
        "15 May 2026",
        `${BASE_URL}/hr/appraisals/goals`
      ),
    }),
  },
  {
    id: "appraisal.unsatisfactory_performance_notice",
    category: "Appraisal",
    name: "Unsatisfactory Performance — Salary Revision & Warning",
    generate: () => ({
      subject: "Notice Regarding Unsatisfactory Performance",
      html: getUnsatisfactoryPerformanceNoticeEmail(
        "Priya Sharma",
        "17th February",
        "17th April",
        "the assigned sales expectations",
        "₹7,000"
      ),
    }),
  },

  {
    id: "crm.lead_welcome",
    category: "CRM",
    name: "Lead Welcome Email",
    generate: () => ({
      subject: "Thank you for contacting Miyo Global",
      html: getLeadWelcomeEmail(
        "Vikram Nair",
        "Miyo Global",
        "info@miyoglobal.com",
        BASE_URL
      ),
    }),
  },
  {
    id: "crm.follow_up",
    category: "CRM",
    name: "Follow-Up Reminder (internal)",
    generate: () => ({
      subject: "Follow up with Vikram Nair",
      html: getFollowUpReminderEmail(
        "Priya Sharma",
        "Vikram Nair",
        7,
        `${BASE_URL}/crm/leads/42`
      ),
    }),
  },
  {
    id: "crm.deal_won",
    category: "CRM",
    name: "Deal Won (team notification)",
    generate: () => ({
      subject: "Deal Won: Nair Enterprises SIP — ₹25,00,000",
      html: getDealWonEmail(
        "Team",
        "Nair Enterprises SIP",
        "₹25,00,000",
        "Priya Sharma",
        `${BASE_URL}/crm/deals`
      ),
    }),
  },
  {
    id: "crm.sla_breach",
    category: "CRM",
    name: "SLA Breach Alert",
    generate: () => ({
      subject: "SLA Breach: Vikram Nair",
      html: getSlaBreachAlertEmail(
        "Priya Sharma",
        "Vikram Nair",
        6,
        `${BASE_URL}/crm/leads/42`
      ),
    }),
  },
  {
    id: "crm.client_onboarding",
    category: "CRM",
    name: "Client Onboarding Email",
    generate: () => ({
      subject: "Welcome to Miyo Global",
      html: getClientOnboardingEmail(
        "Nair Enterprises",
        "Miyo Global",
        "Priya Sharma",
        `${BASE_URL}/client-portal`
      ),
    }),
  },

  {
    id: "project.assigned",
    category: "Projects",
    name: "Project Assignment",
    generate: () => ({
      subject: "Added to Project: Platform Revamp - Miyo Global",
      html: getProjectAssignmentEmailTemplate(
        "Rohan Mehta",
        "Platform Revamp",
        "PLT-001",
        `${BASE_URL}/projects/5`,
        "Anita HR"
      ),
    }),
  },
  {
    id: "project.ticket_assigned",
    category: "Projects",
    name: "Ticket Assigned",
    generate: () => ({
      subject: "Ticket Assigned: Fix dashboard layout - Miyo Global",
      html: getTicketAssignmentEmailTemplate(
        "Rohan Mehta",
        "Fix dashboard layout on mobile",
        "BUG",
        "HIGH",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Priya Sharma"
      ),
    }),
  },
  {
    id: "project.review_request",
    category: "Projects",
    name: "Ticket Review Request",
    generate: () => ({
      subject: "Review Requested: Fix dashboard layout - Miyo Global",
      html: getTicketReviewRequestEmailTemplate(
        "Anita HR",
        "Fix dashboard layout on mobile",
        "BUG",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Rohan Mehta",
        "Tested on iOS and Android — looks good now."
      ),
    }),
  },
  {
    id: "project.changes_requested",
    category: "Projects",
    name: "Changes Requested",
    generate: () => ({
      subject: "Changes Requested: Fix dashboard layout - Miyo Global",
      html: getTicketChangesRequestedEmailTemplate(
        "Rohan Mehta",
        "Fix dashboard layout on mobile",
        "Platform Revamp",
        `${BASE_URL}/projects/5?ticket=101`,
        "Anita HR",
        "Tablet breakpoint (768px) still broken. Please fix and re-test."
      ),
    }),
  },
];

export const CATEGORIES = Array.from(
  new Set(TEMPLATE_REGISTRY.map((t) => t.category))
);
