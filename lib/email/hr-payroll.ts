import { sendTemplateEmail } from "./sender";

/**
 * MIYO-0242: the hand-written payroll-approved template.
 *
 * `payDate` is what the org's payroll schedule says; callers that cannot work
 * it out pass nothing and the mail says the date is not set yet rather than
 * inventing one.
 */
export async function sendPayrollApprovedEmail(
  email: string,
  monthLabel: string,
  payDate?: string | null,
) {
  await sendTemplateEmail("payroll-approved", {
    to: email,
    category: "payroll",
    vars: {
      month_label: monthLabel,
      pay_date: payDate?.trim() || "a date HR will confirm",
    },
  });
}
