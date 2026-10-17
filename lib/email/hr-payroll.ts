import { sendEmail } from "./sender";
import { getPayrollApprovedEmailTemplate } from "../email-templates";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export async function sendPayrollApprovedEmail(
  email: string,
  employeeName: string,
  month: string,
  approverName: string
) {
  await sendEmail({
    to: email,
    subject: `Payroll Approved — ${month}`,
    html: getPayrollApprovedEmailTemplate(employeeName, month, approverName),
  });
}
