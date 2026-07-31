import { sendEmail } from "./sender";
import {
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
  getReviewAssignedEmailTemplate,
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
