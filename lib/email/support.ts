import { sendEmail } from "./sender";
import {
  getTicketCreatedEmailTemplate,
  getTicketReplyEmailTemplate,
  getTicketStatusEmailTemplate,
} from "../email-templates";

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
