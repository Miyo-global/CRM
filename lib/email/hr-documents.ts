import { sendTemplateEmail } from "./sender";

/** MIYO-0274: the hand-written document-expiry-reminder template. */
export async function sendDocumentExpiryReminderEmail(
  email: string,
  documentName: string,
  expiryDate: string,
  daysRemaining: number,
) {
  await sendTemplateEmail("document-expiry-reminder", {
    to: email,
    category: "hr",
    vars: {
      document_name: documentName,
      expiry_date: expiryDate,
      days_left: daysRemaining,
    },
  });
}
