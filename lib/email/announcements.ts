import { sendTemplateEmail } from "./sender";

/** MIYO-0166: the holiday-reminder template. */
export async function sendHolidayAnnouncementEmail(
  email: string,
  holidayName: string,
  holidayDate: string,
  message?: string,
  closureType: string = "Closed",
) {
  await sendTemplateEmail("holiday-reminder", {
    to: email,
    vars: {
      holiday_name: holidayName,
      holiday_date: holidayDate,
      closure_type: closureType,
      message: message ?? "",
    },
  });
}

export async function sendBulkHolidayAnnouncement(
  emails: string[],
  holidayName: string,
  holidayDate: string,
  message?: string,
  closureType?: string,
) {
  const emailPromises = emails.map((email) =>
    sendHolidayAnnouncementEmail(email, holidayName, holidayDate, message, closureType)
  );
  await Promise.allSettled(emailPromises);
}
