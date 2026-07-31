import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getLeaveRequestEmailTemplate,
  getWfhRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getLeaveHrMissedEscalationEmailTemplate,
  getLeaveCeoDelegateEscalationEmailTemplate,
  type LeaveEscalationRow,
} from "../email-templates";

export async function sendWfhRequestEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  wfhDate: string,
  reason: string
) {
  const reviewUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: approverEmail,
    subject: `WFH Request: ${employeeName} - Miyo Global`,
    html: getWfhRequestEmailTemplate(
      approverName,
      employeeName,
      wfhDate,
      reason,
      reviewUrl
    ),
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

export async function sendLeaveHrMissedEscalationEmail(
  email: string,
  hrName: string,
  orgName: string,
  rows: LeaveEscalationRow[],
) {
  const leaveUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: email,
    subject: `[Action Required] ${rows.length} Leave Request${rows.length > 1 ? "s" : ""} Pending > 2 Days`,
    html: getLeaveHrMissedEscalationEmailTemplate(hrName, orgName, rows, leaveUrl),
  });
}

export async function sendLeaveCeoDelegateEscalationEmail(
  email: string,
  ceoName: string,
  orgName: string,
  rows: LeaveEscalationRow[],
) {
  const leaveUrl = `${baseUrl}/hr/leaves`;
  await sendEmail({
    to: email,
    subject: `[Escalation] ${rows.length} Leave Request${rows.length > 1 ? "s" : ""} Still Pending`,
    html: getLeaveCeoDelegateEscalationEmailTemplate(ceoName, orgName, rows, leaveUrl),
  });
}
