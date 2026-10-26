import { formatDateOnly } from "@/lib/date-utils";

/** The "new employee onboarded" notice HR and the CEO receive (bell and email). */
export function onboardedNotification(employee: {
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate?: Date | string | null;
}): { title: string; message: string } {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  const joining = employee.joiningDate ? `, joining ${formatDateOnly(employee.joiningDate)}` : "";
  return {
    // Named in the subject: three hires used to arrive as three identical
    // "New Employee Onboarded" mails (FR1-028).
    title: `New employee onboarded: ${name}`,
    message: `${name} (${employee.designation}) has been onboarded${joining}.`,
  };
}
