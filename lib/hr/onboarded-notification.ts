import { formatCalendarDate, formatDateOnly } from "@/lib/date-utils";
import { ROLES } from "@/lib/constants/roles";

/** Who hears about a new hire. Admins were left out (FR1-037, owner decision). */
export const ONBOARDED_NOTIFY_ROLES = [ROLES.CEO, ROLES.ADMIN, ROLES.HR];

type Hire = {
  firstName: string;
  lastName: string;
  designation?: string | null;
  employeeId?: string | null;
  joiningDate?: Date | string | null;
};

function describeHire(employee: Hire): { name: string; who: string; joining: string } {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  const details = [employee.employeeId, employee.designation].filter(Boolean).join(", ");
  // Same "26 Oct 2026" the welcome mail uses, not the ISO date (FR1-026).
  const joining = employee.joiningDate
    ? `, joining ${formatCalendarDate(formatDateOnly(employee.joiningDate))}`
    : "";
  return { name, who: details ? `${name} (${details})` : name, joining };
}

/** The "new employee onboarded" notice Super Admin, Admins and HR receive (bell and email). */
export function onboardedNotification(employee: Hire): { title: string; message: string } {
  const { name, who, joining } = describeHire(employee);
  return {
    // Named in the subject: three hires used to arrive as three identical
    // "New Employee Onboarded" mails (FR1-028).
    title: `New employee onboarded: ${name}`,
    message: `${who} has been onboarded${joining}.`,
  };
}

/**
 * Sent when the hire finishes set-up and first gets into the portal. The
 * onboarder is left out of the hire-time notice (FR1-027), so a Super Admin
 * who onboarded someone heard nothing at all (P0-no-admin-notify-on-new-onboard).
 */
export function hireJoinedNotification(employee: Hire): { title: string; message: string } {
  const { name, who, joining } = describeHire(employee);
  return {
    title: `New employee joined the portal: ${name}`,
    message: `${who} has set up their account${joining}.`,
  };
}
