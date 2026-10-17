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
  sendBulkHolidayAnnouncement,
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
  sendPayrollApprovedEmail,
} from "@/lib/email/hr-payroll";
import { sendAssetAssignedEmail } from "@/lib/email/hr-assets";
import {
  sendWeeklyAttendanceReportEmail,
  sendMonthlyExpenseReportEmail,
} from "@/lib/email/hr-reports";
import { sendTaskAssignedEmail } from "@/lib/email";
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
import { isEmailConfigured, emailNotConfiguredMessage } from "@/lib/email/config";

const TO = requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the test emails.");
const NAME = process.env.TEST_EMAIL_NAME ?? "Test User";
const ACTOR = "QA Bot";
const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const tests: { name: string; run: () => Promise<unknown> }[] = [
  { name: "auth.verify", run: () => sendVerificationEmail(TO, "test-token-verify-123") },
  { name: "auth.passwordReset", run: () => sendPasswordResetEmail(TO, "test-token-reset-123") },
  { name: "auth.invitation", run: () => sendInvitationEmail(TO, "test-token-invite-123", "Miyo Global", { inviterName: ACTOR, role: "HR" }) },
  { name: "auth.welcome", run: () => sendWelcomeEmail(TO, NAME, "https://crm.miyoglobal.com/onboarding") },
  { name: "auth.passwordChangeConfirm", run: () => sendPasswordChangeConfirmationEmail(TO, NAME) },
  { name: "auth.accountDeactivation", run: () => sendAccountDeactivationEmail(TO, NAME) },
  { name: "auth.accountLocked", run: () => sendAccountLockedEmail(TO, 5, new Date(Date.now() + 15 * 60 * 1000)) },
  { name: "auth.newDeviceLogin", run: () => sendNewDeviceLoginEmail(TO, { userAgent: "Chrome 147 on macOS", ipAddress: "192.0.2.1" }) },
  { name: "auth.passwordExpiryWarning", run: () => sendPasswordExpiryWarningEmail(TO, "24 April 2026") },

  { name: "projects.projectAssignment", run: () => sendProjectAssignmentEmail(TO, { name: "Miyo Global CRM", key: "VAIV", id: 1, role: "member", addedBy: ACTOR }) },
  { name: "projects.ticketAssignment", run: () => sendTicketAssignmentEmail(TO, { key: "VAIV-123", title: "Disable Standard Bonus Modules", priority: "MEDIUM", dueDate: NEXT_WEEK, projectName: "Miyo Global CRM", projectId: 1, assignedBy: ACTOR }) },
  { name: "projects.ticketReviewRequest", run: () => sendTicketReviewRequestEmail(TO, { key: "VAIV-123", title: "Disable Standard Bonus Modules", projectName: "Miyo Global CRM", projectId: 1, requestedBy: ACTOR }) },
  { name: "projects.ticketChangesRequested", run: () => sendTicketChangesRequestedEmail(TO, { key: "VAIV-123", title: "Disable Standard Bonus Modules", projectId: 1, reviewerName: ACTOR, note: "Please add unit tests." }) },

  { name: "hr.helpdeskTicket", run: () => sendHelpdeskTicketEmail(TO, { id: 7, subject: "Cannot access payroll page", category: "Access", status: "OPEN", eventSummary: `${ACTOR} raised a high priority ticket.` }) },

  { name: "hr.expenseSubmitted", run: () => sendExpenseSubmittedEmail(TO, { employeeName: "John Doe", category: "Travel", amount: "1500.00", description: "Cab to client meeting", expenseDate: TODAY, expenseId: 42, hasReceipt: true }) },
  { name: "hr.expenseApproved", run: () => sendExpenseApprovedEmail(TO, "Travel", "1500.00", ACTOR, "with the next monthly payroll") },
  { name: "hr.expenseRejected", run: () => sendExpenseRejectedEmail(TO, "Travel", "1500.00", ACTOR, "Receipt missing") },
  { name: "hr.expensePaid", run: () => sendExpensePaidEmail(TO, "1500.00", TODAY, "TXN-987654") },

  { name: "announce.holiday", run: () => sendHolidayAnnouncementEmail(TO, "Diwali", "08 Nov 2026", "Office will remain closed on this day.") },
  { name: "announce.bulkHoliday", run: () => sendBulkHolidayAnnouncement([TO], "Christmas Day", "25 Dec 2026", "Wishing the team happy holidays.") },

  { name: "hr.resignationSubmitted", run: () => sendResignationSubmittedEmail(TO, { employeeName: "John Doe", employeeCode: "MG-014", department: "Engineering", lastWorkingDay: NEXT_WEEK, noticePeriodDays: 30, reason: "Relocating", resignationId: 12 }) },
  { name: "hr.resignationApproved", run: () => sendResignationApprovedEmail(TO, new Date()) },
  { name: "hr.termination", run: () => sendTerminationEmail(TO, NAME, new Date(), ACTOR) },

  { name: "hr.workLogStatusApproved", run: () => sendWorkLogStatusEmail(TO, TODAY, "APPROVED", ACTOR, { hours: "8.0" }) },
  { name: "hr.workLogStatusRejected", run: () => sendWorkLogStatusEmail(TO, TODAY, "REJECTED", ACTOR, { rejectionReason: "Insufficient detail in entries" }) },
  { name: "hr.reviewAssigned", run: () => sendReviewAssignedEmail(TO, NAME, "Apr–Jun 2026", NEXT_WEEK) },

  { name: "hr.payrollApproved", run: () => sendPayrollApprovedEmail(TO, "April 2026", "30 April 2026") },

  { name: "hr.assetAssigned", run: () => sendAssetAssignedEmail(TO, { name: "MacBook Pro 16", tag: "ASSET-14", serialNumber: "MBP-2026-001", assignedOn: TODAY }) },

  { name: "hr.weeklyAttendanceReport", run: () => sendWeeklyAttendanceReportEmail(
    "27 Apr – 03 May 2026",
    { present: 38, late: 4, absent: 2, onLeave: 6 },
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

  { name: "crm.taskAssigned", run: () => sendTaskAssignedEmail(TO, { title: "Collect signed NDA", dueDate: NEXT_WEEK, assignedBy: ACTOR }) },

  { name: "hr.documentExpiry", run: () => sendDocumentExpiryReminderEmail(TO, "Passport", NEXT_WEEK, 7) },

  { name: "support.ticketCreated", run: () => sendSupportTicketCreatedEmail(TO, { id: 42, subject: "Cannot login on mobile", priority: "HIGH", requesterName: "John Doe" }) },
  { name: "support.ticketReply", run: () => sendSupportTicketReplyEmail(TO, { ticketId: 42, ticketSubject: "Cannot login on mobile", authorName: ACTOR, body: "We have reset your session, please try again." }) },
  { name: "support.ticketStatus", run: () => sendSupportTicketStatusEmail(TO, { id: 42, subject: "Cannot login on mobile", status: "RESOLVED", updatedBy: ACTOR }) },

  { name: "onboarding.welcome", run: () => sendOnboardingWelcomeEmail(TO, NAME, TODAY, 8, ACTOR) },
  { name: "onboarding.task", run: () => sendOnboardingTaskEmail(TO, "John Doe", "3 IT tasks", { joiningDate: TODAY }) },
  { name: "onboarding.completeEmployee", run: () => sendOnboardingCompleteEmployeeEmail(TO, NAME) },
  { name: "onboarding.completeHr", run: () => sendOnboardingCompleteHrEmail(TO, { name: "John Doe", id: "u-123", employeeCode: "MG-014", department: "Engineering" }, 8, TODAY) },

  { name: "hr.leaveRequest", run: () => sendLeaveRequestEmail(TO, NAME, "John Doe", "Annual Leave", TODAY, NEXT_WEEK, "Family vacation") },
  { name: "hr.leaveStatusApproved", run: () => sendLeaveStatusUpdateEmail(TO, NAME, "Annual Leave", TODAY, NEXT_WEEK, "APPROVED", ACTOR) },
  { name: "hr.leaveStatusRejected", run: () => sendLeaveStatusUpdateEmail(TO, NAME, "Annual Leave", TODAY, NEXT_WEEK, "REJECTED", ACTOR, "Coverage unavailable") },
  { name: "hr.leaveCancellation", run: () => sendLeaveCancellationEmail(TO, "John Doe", "Annual Leave", `${TODAY} – ${NEXT_WEEK}`, "APPROVED") },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!isEmailConfigured()) {
    console.error(`${emailNotConfiguredMessage()} Aborting.`);
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
