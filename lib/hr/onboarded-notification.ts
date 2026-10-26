import { formatCalendarDate, formatDateOnly } from "@/lib/date-utils";
import { ROLES } from "@/lib/constants/roles";

/** Who hears about a new hire. Admins were left out (FR1-037, owner decision). */
export const ONBOARDED_NOTIFY_ROLES = [ROLES.CEO, ROLES.ADMIN, ROLES.HR];

/** The "new employee onboarded" notice Super Admin, Admins and HR receive (bell and email). */
export function onboardedNotification(employee: {
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate?: Date | string | null;
}): { title: string; message: string } {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  // Same "26 Oct 2026" the welcome mail uses, not the ISO date (FR1-026).
  const joining = employee.joiningDate
    ? `, joining ${formatCalendarDate(formatDateOnly(employee.joiningDate))}`
    : "";
  return {
    // Named in the subject: three hires used to arrive as three identical
    // "New Employee Onboarded" mails (FR1-028).
    title: `New employee onboarded: ${name}`,
    message: `${name} (${employee.designation}) has been onboarded${joining}.`,
  };
}
