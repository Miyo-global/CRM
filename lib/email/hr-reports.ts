import { sendEmail } from "./sender";
import {
  getWeeklyAttendanceReportTemplate,
  getMonthlyExpenseReportTemplate,
} from "../email-templates";
import type { MonthlyExpenseReportRow } from "../email-templates";
import { generateMonthlyExpenseReportXlsx } from "../monthly-expense-report-xlsx";

export async function sendWeeklyAttendanceReportEmail(
  weekRange: string,
  orgName: string,
  rows: { name: string; totalHours: string; autoCheckoutDays: number; overtimeDays: number; daysPresent: number }[],
  recipientEmails: string[]
) {
  if (recipientEmails.length === 0) return;

  const subject = `Weekly Attendance Report - ${weekRange}`;
  const html = getWeeklyAttendanceReportTemplate(weekRange, orgName, rows);

  for (const email of recipientEmails) {
    await sendEmail({
      to: email,
      subject,
      html,
    });
  }
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
