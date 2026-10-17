import { sendTemplateEmail } from "./sender";

/** First 90 characters of a reply, for the preheader line. */
function snippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
}

/** MIYO-0284: the hand-written support-ticket-created template. */
export async function sendSupportTicketCreatedEmail(
  email: string | string[],
  ticket: {
    id: number;
    subject: string;
    priority: string;
    requesterName: string;
  },
) {
  await sendTemplateEmail("support-ticket-created", {
    to: email,
    vars: {
      ticket_id: ticket.id,
      ticket_subject: ticket.subject,
      priority: ticket.priority.replace(/_/g, " ").toLowerCase(),
      requester_name: ticket.requesterName,
    },
  });
}

/** MIYO-0285: the hand-written support-ticket-reply template. */
export async function sendSupportTicketReplyEmail(
  email: string | string[],
  reply: {
    ticketId: number;
    ticketSubject: string;
    authorName: string;
    body: string;
  },
) {
  await sendTemplateEmail("support-ticket-reply", {
    to: email,
    vars: {
      ticket_id: reply.ticketId,
      ticket_subject: reply.ticketSubject,
      author_name: reply.authorName,
      reply_snippet: snippet(reply.body),
    },
  });
}

/** MIYO-0286: the hand-written support-ticket-status template. */
export async function sendSupportTicketStatusEmail(
  email: string | string[],
  ticket: {
    id: number;
    subject: string;
    status: string;
    updatedBy: string;
  },
) {
  await sendTemplateEmail("support-ticket-status", {
    to: email,
    vars: {
      ticket_id: ticket.id,
      ticket_subject: ticket.subject,
      status: ticket.status.replace(/_/g, " ").toLowerCase(),
      updated_by: ticket.updatedBy,
    },
  });
}
