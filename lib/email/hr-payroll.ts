import { sendEmail } from "./sender";
import { getPayrollApprovedEmailTemplate } from "../email-templates";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export async function sendPayslipGeneratedEmail(
  email: string,
  employeeName: string,
  month: string,
  netSalary: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payslip Generated</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${BRAND.ink}; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.inkDeep} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Miyo Global</h1>
      </div>

      <div style="background: ${BRAND.white}; padding: 30px; border: 1px solid ${BRAND.border}; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: ${BRAND.ink}; margin-top: 0;">Your Payslip is Ready! 📋</h2>

        <p>Dear <strong>${employeeName}</strong>,</p>

        <p>Your payslip for <strong>${month}</strong> has been generated and is now available for viewing.</p>

        <div style="background: ${BRAND.successSoft}; border: 1px solid ${BRAND.success}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: ${BRAND.success}; font-size: 14px;">Net Salary</p>
          <p style="margin: 5px 0 0 0; color: ${BRAND.success}; font-size: 28px; font-weight: bold;">${CURRENCY_SYMBOL}${netSalary}</p>
        </div>

        <p>You can view and download your detailed payslip by logging into your account and navigating to <strong>My Payslips</strong>.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/hr/my-payslips"
             style="background: ${BRAND.ink}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Payslip
          </a>
        </div>

        <p style="color: ${BRAND.inkMuted}; font-size: 14px;">
          If you have any questions regarding your salary, please contact the HR department.
        </p>

        <hr style="border: none; border-top: 1px solid ${BRAND.border}; margin: 30px 0;">

        <p style="color: ${BRAND.inkSubtle}; font-size: 12px; text-align: center; margin: 0;">
          This is an automated email from Miyo Global. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Your Payslip for ${month} is Ready`,
    html,
  });
}

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
