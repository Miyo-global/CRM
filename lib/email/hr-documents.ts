import { sendEmail } from "./sender";
import { getDocumentExpiryReminderEmailTemplate } from "../email-templates";

export async function sendDocumentExpiryReminderEmail(
  email: string,
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
) {
  await sendEmail({
    to: email,
    subject: `Document Expiring Soon: ${documentName}`,
    html: getDocumentExpiryReminderEmailTemplate(
      employeeName,
      documentName,
      documentType,
      expiryDate,
      daysRemaining
    ),
  });
}
