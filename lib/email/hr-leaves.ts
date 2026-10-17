import { sendEmail, sendTemplateEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getLeaveRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  type LeaveEscalationRow,
  leaveStatusSubject,
} from "../email-templates";

/** MIYO-0236: the hand-written wfh-request template. */
export async function sendWfhRequestEmail(
  approverEmail: string | string[],
  employeeName: string,
  dateRange: string,
  reason: string,
) {
  await sendTemplateEmail("wfh-request", {
    to: approverEmail,
    category: "leaves",
    vars: {
      employee_name: employeeName,
      date_range: dateRange,
      reason: reason || "none given",
    },
  });
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
    subject: `Leave Request: ${employeeName}`,
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
  rejectionReason?: string,
  balanceAfter?: number | null,
) {
  await sendEmail({
    to: email,
    subject: leaveStatusSubject(status, startDate, endDate),
    html: getLeaveStatusUpdateEmailTemplate(
      employeeName,
      leaveType,
      startDate,
      endDate,
      status,
      approverName,
      rejectionReason,
      balanceAfter,
    ),
  });
}

/** MIYO-0233: the hand-written leave-cancelled template. */
export async function sendLeaveCancellationEmail(
  email: string,
  employeeName: string,
  leaveType: string,
  dateRange: string,
  previousStatus: string,
) {
  await sendTemplateEmail("leave-cancelled", {
    to: email,
    category: "leaves",
    vars: {
      employee_name: employeeName,
      leave_type: leaveType,
      date_range: dateRange,
      previous_status: previousStatus,
    },
  });
}

/** The oldest waiting request, which both escalation templates lead with. */
function escalationVars(rows: LeaveEscalationRow[]): Record<string, string | number> {
  const oldest = [...rows].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0];
  return {
    count: rows.length,
    employee_1: oldest?.employeeName ?? "",
    dates_1: oldest ? dateRangeLabel(oldest.startDate, oldest.endDate) : "",
    since_1: oldest?.submittedAt ?? "",
    oldest_employee: oldest?.employeeName ?? "",
    oldest_date: oldest?.submittedAt ?? "",
  };
}

/** MIYO-0234: the hand-written leave-escalation-hr template. */
export async function sendLeaveHrMissedEscalationEmail(
  email: string,
  rows: LeaveEscalationRow[],
) {
  await sendTemplateEmail("leave-escalation-hr", {
    to: email,
    category: "leaves",
    vars: escalationVars(rows),
  });
}

/** MIYO-0235: the hand-written leave-escalation-ceo template. */
export async function sendLeaveCeoDelegateEscalationEmail(
  email: string,
  rows: LeaveEscalationRow[],
) {
  await sendTemplateEmail("leave-escalation-ceo", {
    to: email,
    category: "leaves",
    vars: escalationVars(rows),
  });
}

/** "20 Apr 2026" for one day, "20 – 22 Apr 2026" for a range. */
function dateRangeLabel(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
}
