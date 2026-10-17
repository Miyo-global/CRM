import { sendTemplateEmail } from "./sender";
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

/**
 * MIYO-0251: the hand-written expense-monthly-report template.
 *
 * The body is the month at a glance; the full table stays in the attached
 * workbook rather than being rebuilt as HTML, and one send covers everyone.
 */
export async function sendMonthlyExpenseReportEmail(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: {
    totalAmount: string;
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
    paidCount: number;
    rejectedCount: number;
  },
  recipientEmails: string[],
) {
  if (recipientEmails.length === 0) return;

  const xlsxBuffer = await generateMonthlyExpenseReportXlsx(monthLabel, orgName, rows, summary);
  const xlsxFilename = `Monthly-Expense-Report-${monthLabel.replace(/\s+/g, "-")}.xlsx`;

  await sendTemplateEmail("expense-monthly-report", {
    to: recipientEmails,
    category: "expenses",
    vars: {
      month_label: monthLabel,
      claim_count: summary.totalCount,
      pending_count: summary.pendingCount,
      total: summary.totalAmount,
      approved_total: `${summary.approvedCount + summary.paidCount} of ${summary.totalCount}`,
      top_category: topCategory(rows),
    },
    attachments: [
      {
        filename: xlsxFilename,
        content: xlsxBuffer,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}

/** The category with the largest total, which is the line people look for. */
function topCategory(rows: MonthlyExpenseReportRow[]): string {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row.category || "Uncategorised";
    totals.set(key, (totals.get(key) ?? 0) + Number(row.amount || 0));
  }
  const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "none";
}
