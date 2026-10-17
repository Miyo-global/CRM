import { sendEmail, sendTemplateEmail } from "./sender";
import {
  getMonthlyExpenseReportTemplate,
} from "../email-templates";
import type { MonthlyExpenseReportRow } from "../email-templates";
import { generateMonthlyExpenseReportXlsx } from "../monthly-expense-report-xlsx";

export interface WeeklyAttendanceTotals {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

/**
 * MIYO-0239: the hand-written attendance-weekly-report template.
 *
 * The old mail was a per-person table of hours; the template is the week's
 * shape at a glance, which is what a weekly digest is for. One send to all
 * recipients instead of a loop.
 */
export async function sendWeeklyAttendanceReportEmail(
  weekRange: string,
  totals: WeeklyAttendanceTotals,
  recipientEmails: string[],
) {
  if (recipientEmails.length === 0) return;

  const counted = totals.present + totals.late + totals.absent + totals.onLeave;
  await sendTemplateEmail("attendance-weekly-report", {
    to: recipientEmails,
    category: "attendance",
    vars: {
      week_range: weekRange,
      present_pct: counted === 0 ? 0 : Math.round(((totals.present + totals.late) / counted) * 100),
      late_count: totals.late,
      absent_count: totals.absent,
      leave_count: totals.onLeave,
    },
  });
}

export async function sendMonthlyExpenseReportEmail(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: { totalAmount: string; totalCount: number; pendingCount: number; approvedCount: number; paidCount: number; rejectedCount: number },
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Monthly Expense Report - ${monthLabel}`;
  const html = getMonthlyExpenseReportTemplate(monthLabel, orgName, rows, summary);
  const xlsxBuffer = await generateMonthlyExpenseReportXlsx(monthLabel, orgName, rows, summary);
  const safeMonthLabel = monthLabel.replace(/\s+/g, "-");
  const xlsxFilename = `Monthly-Expense-Report-${safeMonthLabel}.xlsx`;

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
      attachments: [
        {
          filename: xlsxFilename,
          content: xlsxBuffer,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });
  }
}
