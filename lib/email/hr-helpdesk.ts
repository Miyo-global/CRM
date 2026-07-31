import { sendEmail } from "./sender";
import { getHelpdeskTicketEmailTemplate } from "../email-templates";

export async function sendHelpdeskTicketEmail(
  email: string,
  recipientName: string,
  ticketTitle: string,
  category: string,
  priority: string,
  creatorName: string
) {
  await sendEmail({
    to: email,
    subject: `Helpdesk Ticket: ${ticketTitle}`,
    html: getHelpdeskTicketEmailTemplate(recipientName, ticketTitle, category, priority, creatorName),
  });
}
