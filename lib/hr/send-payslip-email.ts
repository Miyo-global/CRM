import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { sendTemplateEmail } from "@/lib/email/sender";
import { formatIST, monthKeyToDate } from "@/lib/date-utils";
import { buildPayslipPdfDataFromPayroll, generatePayslipPdf } from "@/lib/payslip-pdf";
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
  grossSalary?: string | null;
  lopDays?: string | null;
  lopAmount?: string | null;
  ptAmount?: string | null;
  otherDeductions?: string | null;
  paidAt?: Date | string | null;
} & Record<string, unknown>;

/** "12,500.00", or "0.00" for a missing figure. */
function money(value: unknown): string {
  const n = parseFloat(String(value ?? "0")) || 0;
  return n.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
      ? format(monthKeyToDate(payroll.month), "MMMM yyyy")
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

    // MIYO-0164: the payroll-payslip template. The subject comes from the
    // template, so an org name with "&" is no longer HTML-escaped into it, and
    // the body carries the gross-to-net breakdown, not the net alone.
    await sendTemplateEmail("payroll-payslip", {
      to: employee.email,
      vars: {
        month_label: monthLabel,
        gross: money(payroll.grossSalary),
        lop_days: payroll.lopDays ? String(parseFloat(payroll.lopDays)) : "0",
        lop_amount: money(payroll.lopAmount),
        pt: money(payroll.ptAmount),
        other_deductions: money(payroll.otherDeductions),
        net_pay: money(payroll.netSalary),
        paid_on: payroll.paidAt ? formatIST(payroll.paidAt) : formatIST(new Date()),
        org_name: org?.name ?? undefined,
      },
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
