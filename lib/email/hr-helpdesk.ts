import { sendTemplateEmail } from "./sender";

/** MIYO-0287: the hand-written helpdesk-ticket template. */
export async function sendHelpdeskTicketEmail(
  email: string | string[],
  ticket: {
    id: number | string;
    subject: string;
    category: string;
    status: string;
    eventSummary: string;
  },
) {
  await sendTemplateEmail("helpdesk-ticket", {
    to: email,
    category: "hr",
    vars: {
      ticket_id: ticket.id,
      ticket_subject: ticket.subject,
      category: ticket.category,
      status: ticket.status.replace(/_/g, " ").toLowerCase(),
      event_summary: ticket.eventSummary,
    },
  });
}
