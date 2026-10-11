import { getEmailTemplate, baseUrl, logoUrl, escapeHtml } from "./base";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export function getExpenseSubmittedEmailTemplate(
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string,
  expenseLink: string
): string {
  const sApprover = escapeHtml(approverName);
  const sEmployee = escapeHtml(employeeName);
  const sCategory = escapeHtml(category);
  const sAmount = escapeHtml(amount);
  const sDescription = description ? escapeHtml(description) : "";
  const content = `
    <h2 class="email-title">🧾 New Expense Claim</h2>
    <p class="email-text">
      Hello <strong>${sApprover}</strong>,
    </p>

    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a new expense claim for your approval.
    </p>

    <div class="credential-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        ${sDescription ? `
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Description:</td>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted};">${sDescription}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${expenseLink}" class="email-button">
        Review Expense Claim
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      Please review and approve or reject this expense claim at your earliest convenience.
    </p>
  `;

  return getEmailTemplate({
    title: `New Expense Claim from ${sEmployee}`,
    preheader: `${sEmployee} submitted a ${CURRENCY_SYMBOL}${sAmount} expense claim`,
    content,
  });
}

export function getExpenseApprovedEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  approverName: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sCategory = escapeHtml(category);
  const sAmount = escapeHtml(amount);
  const sApprover = escapeHtml(approverName);
  const content = `
    <h2 class="email-title">✅ Expense Claim Approved</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      Great news! Your expense claim has been <strong style="color: ${BRAND.success};">approved</strong> by <strong>${sApprover}</strong>.
    </p>

    <div class="credential-box" style="border-left-color: ${BRAND.success};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: ${BRAND.success}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: ${BRAND.successSoft}; color: ${BRAND.success}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">APPROVED</span></td>
        </tr>
      </table>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      The reimbursement will be processed as per company policy. If you have any questions, please contact HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Claim Approved - ${CURRENCY_SYMBOL}${sAmount}`,
    preheader: `Your ${CURRENCY_SYMBOL}${sAmount} expense claim has been approved`,
    content,
  });
}

export function getExpenseRejectedEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  approverName: string,
  reason: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sCategory = escapeHtml(category);
  const sAmount = escapeHtml(amount);
  const sApprover = escapeHtml(approverName);
  const sReason = escapeHtml(reason);
  const content = `
    <h2 class="email-title">❌ Expense Claim Rejected</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      Unfortunately, your expense claim has been <strong style="color: ${BRAND.danger};">rejected</strong> by <strong>${sApprover}</strong>.
    </p>

    <div class="credential-box" style="border-left-color: ${BRAND.danger};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: ${BRAND.danger}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: ${BRAND.dangerSoft}; color: ${BRAND.danger}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">REJECTED</span></td>
        </tr>
      </table>
    </div>

    <div class="credential-box" style="margin-top: 16px; border-left-color: ${BRAND.warning};">
      <p style="margin: 0 0 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Reason for rejection:</p>
      <p style="margin: 0; color: ${BRAND.ink}; font-style: italic;">"${sReason}"</p>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      If you believe this is an error or have questions, please contact your manager or HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Claim Rejected - ${CURRENCY_SYMBOL}${sAmount}`,
    preheader: `Your ${CURRENCY_SYMBOL}${sAmount} expense claim has been rejected`,
    content,
  });
}

export function getExpensePaidEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  transactionRef?: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sCategory = escapeHtml(category);
  const sAmount = escapeHtml(amount);
  const sRef = transactionRef ? escapeHtml(transactionRef) : undefined;
  const content = `
    <h2 class="email-title">💰 Expense Reimbursed</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      Your expense claim has been <strong style="color: ${BRAND.info};">reimbursed</strong>! The amount has been credited to your account.
    </p>

    <div class="credential-box" style="border-left-color: ${BRAND.info};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sCategory}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount Reimbursed:</td>
          <td style="padding: 8px 0; color: ${BRAND.info}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        ${sRef ? `
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Transaction Ref:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-family: monospace;">${sRef}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: ${BRAND.infoSoft}; color: ${BRAND.info}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">PAID</span></td>
        </tr>
      </table>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      Please check your bank account for the credited amount. Contact HR if you don't receive the payment within 2-3 business days.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Reimbursed - ${CURRENCY_SYMBOL}${sAmount}`,
    preheader: `Your ${CURRENCY_SYMBOL}${sAmount} expense has been reimbursed`,
    content,
  });
}
