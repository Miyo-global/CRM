import { sendEmail, sendTemplateEmail } from "./sender";
import { appUrl } from "@/lib/app-url";
import {
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
} from "../email-templates";

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

/** MIYO-0257: the hand-written perf-review-assigned template. */
export async function sendReviewAssignedEmail(
  email: string,
  employeeName: string,
  cycleName: string,
  dueDate: string,
) {
  await sendTemplateEmail("perf-review-assigned", {
    to: email,
    category: "hr",
    vars: {
      employee_name: employeeName,
      cycle_name: cycleName,
      due_date: dueDate,
      review_url: `${appUrl}/hr/performance`,
    },
  });
}

/** MIYO-0258: the hand-written perf-self-review-reminder template. */
export async function sendSelfReviewReminderEmail(
  email: string,
  cycleName: string,
  dueDate: string,
) {
  await sendTemplateEmail("perf-self-review-reminder", {
    to: email,
    category: "hr",
    vars: {
      cycle_name: cycleName,
      due_date: dueDate,
      review_url: `${appUrl}/hr/performance`,
    },
  });
}

/** MIYO-0259: the hand-written perf-manager-review-reminder template. */
export async function sendManagerReviewReminderEmail(
  email: string,
  cycleName: string,
  dueDate: string,
  pendingCount: number,
) {
  await sendTemplateEmail("perf-manager-review-reminder", {
    to: email,
    category: "hr",
    vars: { cycle_name: cycleName, due_date: dueDate, pending_count: pendingCount },
  });
}

/** MIYO-0260: the hand-written perf-review-published template. */
export async function sendReviewPublishedEmail(
  email: string,
  cycleName: string,
  managerName: string,
) {
  await sendTemplateEmail("perf-review-published", {
    to: email,
    category: "hr",
    vars: {
      cycle_name: cycleName,
      manager_name: managerName,
      review_url: `${appUrl}/hr/performance`,
    },
  });
}

/** MIYO-0261: the hand-written perf-goal-setting-reminder template. */
export async function sendGoalSettingReminderEmail(
  email: string,
  quarter: string,
  dueDate: string,
  managerName: string,
) {
  await sendTemplateEmail("perf-goal-setting-reminder", {
    to: email,
    category: "hr",
    vars: { quarter, due_date: dueDate, manager_name: managerName },
  });
}

/** MIYO-0265: the hand-written perf-unsatisfactory-notice template. */
export async function sendUnsatisfactoryPerformanceNoticeEmail(
  email: string,
  managerName: string,
  meetingDate: string,
  noticeUrl: string,
) {
  await sendTemplateEmail("perf-unsatisfactory-notice", {
    to: email,
    vars: { manager_name: managerName, meeting_date: meetingDate, notice_url: noticeUrl },
  });
}
