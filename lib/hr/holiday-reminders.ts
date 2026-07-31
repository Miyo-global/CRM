import { addDays, formatDateOnly, formatDisplayDate, fromISODateString } from "@/lib/date-utils";

/** Tomorrow's calendar date in Asia/Kolkata (matches how holidays are stored). */
export function getTomorrowDateString(): string {
  return formatDateOnly(addDays(new Date(), 1));
}

export function isHolidayTomorrow(holidayDate: string): boolean {
  return holidayDate === getTomorrowDateString();
}

export function formatHolidayReminderDate(holidayDate: string): string {
  return formatDisplayDate(fromISODateString(holidayDate), {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
