import { sendEmail } from "./sender";
import { getHolidayAnnouncementEmailTemplate } from "../email-templates";

export async function sendHolidayAnnouncementEmail(
  email: string,
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  await sendEmail({
    to: email,
    subject: `Holiday Tomorrow: ${holidayName}`,
    html: getHolidayAnnouncementEmailTemplate(holidayName, holidayDate, message),
  });
}

export async function sendBulkHolidayAnnouncement(
  emails: string[],
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  const emailPromises = emails.map((email) =>
    sendHolidayAnnouncementEmail(email, holidayName, holidayDate, message)
  );
  await Promise.allSettled(emailPromises);
}
