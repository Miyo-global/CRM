import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInvitationEmail,
  sendWelcomeEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountDeactivationEmail,
  sendAccountLockedEmail,
  sendNewDeviceLoginEmail,
  sendPasswordExpiryWarningEmail,
} from "@/lib/email/auth";
import {
  sendProjectAssignmentEmail,
  sendTicketAssignmentEmail,
  sendTicketReviewRequestEmail,
  sendTicketChangesRequestedEmail,
} from "@/lib/email/projects";
import { sendHelpdeskTicketEmail } from "@/lib/email/hr-helpdesk";
import {
  sendExpenseSubmittedEmail,
  sendExpenseApprovedEmail,
  sendExpenseRejectedEmail,
  sendExpensePaidEmail,
} from "@/lib/email/hr-expenses";
import {
  sendHolidayAnnouncementEmail,
  sendCompanyAnnouncementEmail,
  sendBulkHolidayAnnouncement,
  sendBulkCompanyAnnouncement,
} from "@/lib/email/announcements";
import {
  sendResignationSubmittedEmail,
  sendResignationApprovedEmail,
  sendTerminationEmail,
} from "@/lib/email/hr-employees";
import {
  sendWorkLogStatusEmail,
  sendReviewAssignedEmail,
} from "@/lib/email/hr-performance";
import {
  sendPayslipGeneratedEmail,
  sendPayrollApprovedEmail,
} from "@/lib/email/hr-payroll";
import { sendAssetAssignedEmail } from "@/lib/email/hr-assets";
import {
  sendWeeklyAttendanceReportEmail,
  sendMonthlyExpenseReportEmail,
} from "@/lib/email/hr-reports";
import {
  sendDealStageChangeEmail,
  sendLeadAssignedEmail,
  sendTaskAssignedEmail,
} from "@/lib/email/crm";
import { sendDocumentExpiryReminderEmail } from "@/lib/email/hr-documents";
import {
  sendSupportTicketCreatedEmail,
  sendSupportTicketReplyEmail,
  sendSupportTicketStatusEmail,
} from "@/lib/email/support";
import {
  sendOnboardingWelcomeEmail,
  sendOnboardingTaskEmail,
  sendOnboardingCompleteEmployeeEmail,
  sendOnboardingCompleteHrEmail,
} from "@/lib/email/onboarding";
import {
  sendLeaveRequestEmail,
  sendLeaveStatusUpdateEmail,
  sendLeaveCancellationEmail,
} from "@/lib/email/hr-leaves";
import { requireEmailEnv } from "./_guard";
import { DEFAULT_CURRENCY } from "@/lib/constants/locale";

const TO = requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the test emails.");
const NAME = process.env.TEST_EMAIL_NAME ?? "Test User";
const ACTOR = "QA Bot";
const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const tests: { name: string; run: () => Promise<unknown> }[] = [
  { name: "auth.verify", run: () => sendVerificationEmail(TO, "test-token-verify-123") },
  { name: "auth.passwordReset", run: () => sendPasswordResetEmail(TO, "test-token-reset-123") },
  { name: "auth.invitation", run: () => sendInvitationEmail(TO, "test-token-invite-123", "Miyo Global", ACTOR) },
  { name: "auth.welcome", run: () => sendWelcomeEmail(TO, NAME, "https://crm.miyoglobal.com/onboarding") },
  { name: "auth.passwordChangeConfirm", run: () => sendPasswordChangeConfirmationEmail(TO, NAME) },
  { name: "auth.accountDeactivation", run: () => sendAccountDeactivationEmail(TO, NAME, ACTOR, "Test deactivation reason") },
  { name: "auth.accountLocked", run: () => sendAccountLockedEmail(TO, NAME) },
  { name: "auth.newDeviceLogin", run: () => sendNewDeviceLoginEmail(TO, NAME, { userAgent: "Chrome 147 on macOS", ipAddress: "192.0.2.1", time: new Date().toISOString() }) },
  { name: "auth.passwordExpiryWarning", run: () => sendPasswordExpiryWarningEmail(TO, NAME, 7) },

  { name: "projects.projectAssignment", run: () => sendProjectAssignmentEmail(TO, NAME, "Miyo Global CRM", "VAIV", 1, ACTOR) },
  { name: "projects.ticketAssignment", run: () => sendTicketAssignmentEmail(TO, NAME, "Disable Standard Bonus Modules", "STORY", "MEDIUM", "Miyo Global CRM", 1, 123, ACTOR, "VAIV-123") },
  { name: "projects.ticketReviewRequest", run: () => sendTicketReviewRequestEmail(TO, NAME, "Disable Standard Bonus Modules", "STORY", "Miyo Global CRM", 1, 123, ACTOR, "Ready for your review.") },
  { name: "projects.ticketChangesRequested", run: () => sendTicketChangesRequestedEmail(TO, NAME, "Disable Standard Bonus Modules", "Miyo Global CRM", 1, 123, ACTOR, "Please add unit tests.") },

  { name: "hr.helpdeskTicket", run: () => sendHelpdeskTicketEmail(TO, NAME, "Cannot access payroll page", "Access", "HIGH", ACTOR) },

  { name: "hr.expenseSubmitted", run: () => sendExpenseSubmittedEmail(TO, NAME, "John Doe", "Travel", "1500.00", "Cab to client meeting") },
  { name: "hr.expenseApproved", run: () => sendExpenseApprovedEmail(TO, NAME, "Travel", "1500.00", ACTOR) },
  { name: "hr.expenseRejected", run: () => sendExpenseRejectedEmail(TO, NAME, "Travel", "1500.00", ACTOR, "Receipt missing") },
  { name: "hr.expensePaid", run: () => sendExpensePaidEmail(TO, NAME, "Travel", "1500.00", "TXN-987654") },

  { name: "announce.holiday", run: () => sendHolidayAnnouncementEmail(TO, "Diwali", "08 Nov 2026", "Office will remain closed on this day.") },
  { name: "announce.company", run: () => sendCompanyAnnouncementEmail(TO, "All-hands meeting Friday", "Please join the all-hands at 4pm IST on Friday.", ACTOR) },
  { name: "announce.bulkHoliday", run: () => sendBulkHolidayAnnouncement([TO], "Christmas Day", "25 Dec 2026", "Wishing the team happy holidays.") },
  { name: "announce.bulkCompany", run: () => sendBulkCompanyAnnouncement([TO], "Q1 results announcement", "Q1 results will be shared on Monday morning.", ACTOR) },

  { name: "hr.resignationSubmitted", run: () => sendResignationSubmittedEmail(TO, NAME, "John Doe", "Senior Engineer", TODAY, NEXT_WEEK, 30, "Personal reasons") },
  { name: "hr.resignationApproved", run: () => sendResignationApprovedEmail(TO, NAME, ACTOR, NEXT_WEEK, 30, TODAY) },
  { name: "hr.termination", run: () => sendTerminationEmail(TO, NAME, "Senior Engineer", TODAY, ACTOR, "Performance concerns") },

  { name: "hr.workLogStatusApproved", run: () => sendWorkLogStatusEmail(TO, NAME, TODAY, "APPROVED", ACTOR) },
  { name: "hr.workLogStatusRejected", run: () => sendWorkLogStatusEmail(TO, NAME, TODAY, "REJECTED", ACTOR, "Insufficient detail in entries") },
  { name: "hr.reviewAssigned", run: () => sendReviewAssignedEmail(TO, NAME, ACTOR, "2026-01-01", "2026-03-31") },

  { name: "hr.payslipGenerated", run: () => sendPayslipGeneratedEmail(TO, NAME, "April 2026", "85,000.00") },
  { name: "hr.payrollApproved", run: () => sendPayrollApprovedEmail(TO, NAME, "April 2026", ACTOR) },

  { name: "hr.assetAssigned", run: () => sendAssetAssignedEmail(TO, NAME, "MacBook Pro 16\"", "Laptop", "MBP-2026-001") },

  { name: "hr.weeklyAttendanceReport", run: () => sendWeeklyAttendanceReportEmail(
    "27 Apr – 03 May 2026",
    "Miyo Global",
    [
      { name: "John Doe", totalHours: "42.5", autoCheckoutDays: 1, overtimeDays: 2, daysPresent: 5 },
      { name: "Jane Smith", totalHours: "40.0", autoCheckoutDays: 0, overtimeDays: 0, daysPresent: 5 },
    ],
    [TO],
  ) },
  { name: "hr.monthlyExpenseReport", run: () => sendMonthlyExpenseReportEmail(
    "April 2026",
    "Miyo Global",
    [
      { date: TODAY, employeeName: "John Doe", category: "Travel", amount: "1500.00", currency: DEFAULT_CURRENCY, status: "APPROVED" },
      { date: TODAY, employeeName: "Jane Smith", category: "Meals", amount: "850.00", currency: DEFAULT_CURRENCY, status: "PAID" },
    ],
    { totalAmount: "2350.00", totalCount: 2, pendingCount: 0, approvedCount: 1, paidCount: 1, rejectedCount: 0 },
    [TO],
  ) },

  { name: "crm.dealStageChange", run: () => sendDealStageChangeEmail(TO, NAME, "Acme Corp - Annual Subscription", "Proposal", "Negotiation", "250000.00", ACTOR, 1) },
  { name: "crm.leadAssigned", run: () => sendLeadAssignedEmail(TO, NAME, "Acme Corp", "Website", "HOT", ACTOR) },
  { name: "crm.taskAssigned", run: () => sendTaskAssignedEmail(TO, NAME, "Follow up with prospect", "FOLLOW_UP", NEXT_WEEK, ACTOR, "Lead: Acme Corp") },

  { name: "hr.documentExpiry", run: () => sendDocumentExpiryReminderEmail(TO, NAME, "PAN Card", "Identity", NEXT_WEEK, 7) },

  { name: "support.ticketCreated", run: () => sendSupportTicketCreatedEmail(TO, NAME, "Cannot login on mobile", "HIGH", ACTOR, 42) },
  { name: "support.ticketReply", run: () => sendSupportTicketReplyEmail(TO, NAME, "Cannot login on mobile", 42, ACTOR, "Have you tried clearing your cache and reinstalling the app?") },
  { name: "support.ticketStatus", run: () => sendSupportTicketStatusEmail(TO, NAME, "Cannot login on mobile", 42, "RESOLVED", ACTOR) },

  { name: "onboarding.welcome", run: () => sendOnboardingWelcomeEmail(TO, NAME, "Senior Engineer", TODAY, 8) },
  { name: "onboarding.task", run: () => sendOnboardingTaskEmail(TO, NAME, "John Doe", "IT", 3) },
  { name: "onboarding.completeEmployee", run: () => sendOnboardingCompleteEmployeeEmail(TO, NAME) },
  { name: "onboarding.completeHr", run: () => sendOnboardingCompleteHrEmail(TO, NAME, "John Doe") },

  { name: "hr.leaveRequest", run: () => sendLeaveRequestEmail(TO, NAME, "John Doe", "Annual Leave", TODAY, NEXT_WEEK, "Family vacation") },
  { name: "hr.leaveStatusApproved", run: () => sendLeaveStatusUpdateEmail(TO, NAME, "Annual Leave", TODAY, NEXT_WEEK, "APPROVED", ACTOR) },
  { name: "hr.leaveStatusRejected", run: () => sendLeaveStatusUpdateEmail(TO, NAME, "Annual Leave", TODAY, NEXT_WEEK, "REJECTED", ACTOR, "Coverage unavailable") },
  { name: "hr.leaveCancellation", run: () => sendLeaveCancellationEmail(TO, NAME, "John Doe", "Annual Leave", TODAY, NEXT_WEEK) },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY is not set. Aborting.");
    process.exit(1);
  }

  console.log(`Sending ${tests.length} email tests to ${TO}...\n`);

  let sent = 0;
  let failed = 0;
  const failures: { name: string; error: string }[] = [];

  for (const t of tests) {
    const idx = sent + failed + 1;
    try {
      await t.run();
      sent += 1;
      console.log(`  [${idx}/${tests.length}] OK   — ${t.name}`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ name: t.name, error: msg });
      console.error(`  [${idx}/${tests.length}] FAIL — ${t.name}: ${msg}`);
    }
    await delay(500);
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
