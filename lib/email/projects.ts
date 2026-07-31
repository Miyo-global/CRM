import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
  getTicketCommentEmailTemplate,
} from "../email-templates";

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
