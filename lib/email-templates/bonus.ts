import { getEmailTemplate, escapeHtml } from "./base";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

export function getBonusPaidEmployeeEmailTemplate(params: {
  employeeName: string;
  amount: string;
  typeLabel: string;
  reason?: string | null;
  markedByName: string;
  bonusesUrl: string;
}): string {
  const sEmployee = escapeHtml(params.employeeName);
  const sAmount = escapeHtml(params.amount);
  const sType = escapeHtml(params.typeLabel);
  const sMarkedBy = escapeHtml(params.markedByName);
  const sReason = params.reason?.trim() ? escapeHtml(params.reason.trim()) : null;

  const content = `
    <h2 class="email-title">Bonus Marked as Paid</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>
    <p class="email-text">
      Your <strong>${sType}</strong> bonus has been <strong style="color: ${BRAND.goldDark};">marked as paid</strong> by ${sMarkedBy}.
    </p>
    <div class="credential-box" style="border-left-color: ${BRAND.gold};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: ${BRAND.goldDark}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        ${sReason ? `
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Reason:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink};">${sReason}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: ${BRAND.warningSoft}; color: ${BRAND.warning}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">PAID</span></td>
        </tr>
      </table>
    </div>
    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      You can view your bonus history in the HR portal. Contact HR if you have any questions.
    </p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(params.bonusesUrl)}" class="email-button">View My Bonuses</a>
    </p>
  `;

  return getEmailTemplate({
    title: `Bonus Paid — ${CURRENCY_SYMBOL}${sAmount}`,
    preheader: `Your ${sType} bonus of ${CURRENCY_SYMBOL}${sAmount} has been marked as paid`,
    content,
  });
}

export function getBonusPaidStakeholderEmailTemplate(params: {
  employeeName: string;
  amount: string;
  typeLabel: string;
  reason?: string | null;
  markedByName: string;
  bonusesUrl: string;
}): string {
  const sEmployee = escapeHtml(params.employeeName);
  const sAmount = escapeHtml(params.amount);
  const sType = escapeHtml(params.typeLabel);
  const sMarkedBy = escapeHtml(params.markedByName);
  const sReason = params.reason?.trim() ? escapeHtml(params.reason.trim()) : null;

  const content = `
    <h2 class="email-title">Bonus Disbursed</h2>
    <p class="email-text">
      <strong>${sMarkedBy}</strong> marked a bonus as <strong style="color: ${BRAND.goldDark};">paid</strong> for <strong>${sEmployee}</strong>.
    </p>
    <div class="credential-box" style="border-left-color: ${BRAND.gold};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Employee:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sEmployee}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink}; font-weight: 600;">${sType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: ${BRAND.goldDark}; font-weight: 700; font-size: 18px;">${CURRENCY_SYMBOL}${sAmount}</td>
        </tr>
        ${sReason ? `
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Reason:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink};">${sReason}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: ${BRAND.inkMuted}; font-size: 14px;">Marked by:</td>
          <td style="padding: 8px 0; color: ${BRAND.ink};">${sMarkedBy}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(params.bonusesUrl)}" class="email-button">Open Bonuses</a>
    </p>
  `;

  return getEmailTemplate({
    title: `Bonus paid for ${sEmployee}`,
    preheader: `${sMarkedBy} marked a ${CURRENCY_SYMBOL}${sAmount} ${sType} bonus as paid for ${sEmployee}`,
    content,
  });
}
