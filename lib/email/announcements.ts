import { sendEmail } from "./sender";
import {
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "../email-templates";

export async function sendHolidayAnnouncementEmail(
  email: string,
  holidayName: string,
  holidayDate: string,
  message?: string
) {
  await sendEmail({
    to: email,
    subject: `Holiday Tomorrow: ${holidayName} - Miyo Global`,
    html: getHolidayAnnouncementEmailTemplate(holidayName, holidayDate, message),
  });
}

export async function sendCompanyAnnouncementEmail(
  email: string,
  subject: string,
  message: string,
  announcedBy: string
) {
  await sendEmail({
    to: email,
    subject: `Announcement: ${subject} - Miyo Global`,
    html: getCompanyAnnouncementEmailTemplate(subject, message, announcedBy),
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

export async function sendBulkCompanyAnnouncement(
  emails: string[],
  subject: string,
  message: string,
  announcedBy: string
) {
  const emailPromises = emails.map((email) =>
    sendCompanyAnnouncementEmail(email, subject, message, announcedBy)
  );
  await Promise.allSettled(emailPromises);
}
