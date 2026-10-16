import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { sendEmail } from "@/lib/email";
import { buildPayslipPdfDataFromPayroll, generatePayslipPdf } from "@/lib/payslip-pdf";
import { getPayslipEmailTemplate } from "@/lib/email-templates/hr";
import { countApprovedLeaveDaysInMonth } from "@/server/queries/hr/payslip-leave-days";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { appUrl } from "@/lib/app-url";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

export type PayslipEmailError = "no_email" | "send_failed";

export type PayslipEmailResult = {
  emailSent: boolean;
  emailError?: PayslipEmailError;
};

type PayrollRow = {
  id: number;
  userId: string;
  month: string;
  netSalary: string | null;
  leaveDaysDisplay: string | null;
} & Record<string, unknown>;

const ORG_FULL_NAME_HEADER = "Miyo Global";

/**
 * Sends the payslip for one payroll row.
 *
 * Marking paid twice, or a retry of the same action, sent the employee two
 * identical payslip mails (QA-0073). A marker keyed by payroll id suppresses
 * the repeat; the explicit "email payslip" button passes force.
 */
export async function sendPayslipEmailForPayroll(
  orgId: string,
  payroll: PayrollRow,
  opts?: { force?: boolean }
): Promise<PayslipEmailResult> {
  try {
    const sentKey = `payslip-email:${orgId}:${payroll.id}`;
    if (!opts?.force) {
      const alreadySent = await redis.get<boolean>(sentKey).catch(() => null);
      if (alreadySent) {
        logger.info("Payslip email already sent, skipping", { payrollId: payroll.id });
        return { emailSent: true };
      }
    }
    const [employee, org] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, payroll.userId) }),
      db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    ]);

    if (!employee?.email) {
      return { emailSent: false, emailError: "no_email" };
    }

    const monthLabel = payroll.month
      ? format(new Date(payroll.month + "-01"), "MMMM yyyy")
      : "Unknown Month";

    const leaveDays =
      payroll.leaveDaysDisplay != null
        ? parseFloat(payroll.leaveDaysDisplay)
        : payroll.month && payroll.userId
          ? await countApprovedLeaveDaysInMonth(orgId, payroll.userId, payroll.month)
          : 0;

    const pdfBase = buildPayslipPdfDataFromPayroll(
      payroll as unknown as Parameters<typeof buildPayslipPdfDataFromPayroll>[0],
      employee,
      org ?? { name: null, address: null },
      {
        leaveDaysInMonth: leaveDays,
        showPaidBadge: true,
        orgFullNameOverride: ORG_FULL_NAME_HEADER,
      }
    );
    const pdfBuffer = await generatePayslipPdf(pdfBase);

    const netSalary = parseFloat(payroll.netSalary || "0");
    const emailContent = getPayslipEmailTemplate({
      employeeName: employee.name ?? "Employee",
      month: monthLabel,
      netSalary: netSalary.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2 }),
      orgName: org?.name ?? "Company",
      payslipUrl: `${appUrl}/api/hr/payrolls/${payroll.id}/download`,
    });

    await sendEmail({
      to: employee.email,
      subject: `Your Payslip for ${monthLabel} — ${org?.name ?? "Company"}`,
      html: emailContent.html,
      attachments: [
        {
          filename: `Payslip-${(employee.name ?? "employee").replace(/\s+/g, "-")}-${payroll.month ?? "unknown"}.pdf`,
          content: pdfBuffer,
          type: "application/pdf",
        },
      ],
    });

    // Thirty days is longer than any payroll cycle, so a repeat of the same
    // action is covered.
    await redis.set(sentKey, true, { ex: 30 * 24 * 60 * 60 }).catch(() => undefined);

    return { emailSent: true };
  } catch (e) {
    logger.error("Failed to send payslip email", { payrollId: payroll.id, error: e });
    return { emailSent: false, emailError: "send_failed" };
  }
}
