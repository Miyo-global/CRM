import { getEmailTemplate, baseUrl, logoUrl, escapeHtml } from "./base";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export function getWeeklyAttendanceReportTemplate(
  weekRange: string,
  orgName: string,
  rows: { name: string; totalHours: string; autoCheckoutDays: number; overtimeDays: number; daysPresent: number }[]
): string {
  const sOrgName = escapeHtml(orgName);
  const sWeekRange = escapeHtml(weekRange);
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; color: ${BRAND.inkMuted};">${escapeHtml(r.name)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; color: ${BRAND.ink};">${r.daysPresent}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; color: ${BRAND.ink};">${escapeHtml(r.totalHours)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; color: ${BRAND.ink};">${r.overtimeDays}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; color: ${r.autoCheckoutDays > 0 ? BRAND.danger : BRAND.ink};">${r.autoCheckoutDays}</td>
      </tr>`
    )
    .join("");

  const content = `
    <h2 class="email-title">Weekly Attendance Report</h2>
    <p class="email-text">
      Here is the weekly attendance summary for <strong>${sOrgName}</strong> for the period <strong>${sWeekRange}</strong>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: ${BRAND.sunken};">
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: left; font-weight: 600; color: ${BRAND.ink};">Employee</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; font-weight: 600; color: ${BRAND.ink};">Days Present</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; font-weight: 600; color: ${BRAND.ink};">Total Hours</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; font-weight: 600; color: ${BRAND.ink};">Overtime Days</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; font-weight: 600; color: ${BRAND.ink};">Auto-Checkout</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      This is an automated weekly report. Review attendance details in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Weekly Attendance Report - ${weekRange}`,
    preheader: `Attendance summary for ${weekRange}`,
    content,
  });
}

export interface MonthlyExpenseReportRow {
  date: string;
  employeeName: string;
  category: string;
  amount: string;
  currency: string;
  status: string;
}

export function getMonthlyExpenseReportTemplate(
  monthLabel: string,
  orgName: string,
  rows: MonthlyExpenseReportRow[],
  summary: { totalAmount: string; totalCount: number; pendingCount: number; approvedCount: number; paidCount: number; rejectedCount: number }
): string {
  const sOrgName = escapeHtml(orgName);
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; color: ${BRAND.inkMuted};">${escapeHtml(r.date)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; color: ${BRAND.inkMuted};">${escapeHtml(r.employeeName)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; color: ${BRAND.inkMuted};">${escapeHtml(r.category)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: right; color: ${BRAND.ink};">${r.currency === "INR" ? "₹" : ""}${escapeHtml(r.amount)}</td>
        <td style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; color: ${BRAND.ink};">${escapeHtml(r.status)}</td>
      </tr>`
    )
    .join("");

  const content = `
    <h2 class="email-title">Monthly Expense Report</h2>
    <p class="email-text">
      Here is the expense summary for <strong>${sOrgName}</strong> for <strong>${monthLabel}</strong>.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: ${BRAND.sunken};">
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: left; font-weight: 600; color: ${BRAND.ink};">Date</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: left; font-weight: 600; color: ${BRAND.ink};">Employee</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: left; font-weight: 600; color: ${BRAND.ink};">Category</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: right; font-weight: 600; color: ${BRAND.ink};">Amount</th>
          <th style="border: 1px solid ${BRAND.border}; padding: 8px 12px; text-align: center; font-weight: 600; color: ${BRAND.ink};">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div style="background-color: ${BRAND.sunken}; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p class="email-text" style="margin: 0 0 8px 0;"><strong>Summary</strong></p>
      <p class="email-text" style="margin: 0; font-size: 14px;">Total amount: <strong>${CURRENCY_SYMBOL}${escapeHtml(summary.totalAmount)}</strong> &nbsp;|&nbsp; Total expenses: <strong>${summary.totalCount}</strong> &nbsp;|&nbsp; Pending: ${summary.pendingCount} &nbsp;|&nbsp; Approved: ${summary.approvedCount} &nbsp;|&nbsp; Paid: ${summary.paidCount} &nbsp;|&nbsp; Rejected: ${summary.rejectedCount}</p>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      This is an automated monthly report. Review expense details in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Monthly Expense Report - ${monthLabel}`,
    preheader: `Expense summary for ${monthLabel}`,
    content,
  });
}
