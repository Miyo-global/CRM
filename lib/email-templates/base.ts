import { appUrl } from "../app-url";
import { BRAND } from "@/lib/design/brand-hex";

export const baseUrl = appUrl;

export const logoUrl = `${baseUrl}/logo.png`;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailTemplateProps {
  title: string;
  preheader?: string;
  content: string;
}

export function getEmailTemplate({ title, preheader, content }: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  ${preheader ? `<meta name="description" content="${escapeHtml(preheader)}">` : ''}
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND.canvas};
      color: ${BRAND.ink};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .email-title {
      font-size: 20px;
      font-weight: 600;
      color: ${BRAND.ink};
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    .email-text {
      font-size: 15px;
      color: ${BRAND.inkMuted};
      margin: 0 0 12px 0;
      line-height: 1.6;
    }
    .email-button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${BRAND.ink};
      color: ${BRAND.white} !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0;
    }
    .credential-box {
      background-color: ${BRAND.sunken};
      border: 1px solid ${BRAND.border};
      border-left: 3px solid ${BRAND.gold};
      padding: 16px;
      margin: 16px 0;
    }
    .credential-item { margin: 6px 0; font-size: 14px; }
    .credential-label { font-weight: 600; color: ${BRAND.ink}; }
    .credential-value { color: ${BRAND.ink}; font-family: "Courier New", monospace; }
    .divider { height: 1px; background-color: ${BRAND.border}; margin: 24px 0; font-size: 0; line-height: 0; }
    .email-footer { background-color: ${BRAND.sunken}; border-top: 1px solid ${BRAND.border}; }
    .footer-text { font-size: 13px; color: ${BRAND.inkMuted}; margin: 6px 0; }
    .footer-link { color: ${BRAND.ink}; text-decoration: underline; }
    .security-notice {
      background-color: ${BRAND.warningSoft};
      border: 1px solid ${BRAND.border};
      border-left: 3px solid ${BRAND.warning};
      padding: 14px;
      margin: 16px 0;
    }
    .security-text { font-size: 13px; color: ${BRAND.warning}; margin: 0; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.canvas};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.canvas};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:${BRAND.white};border:1px solid ${BRAND.border};">
          <tr>
            <td style="padding:20px 32px;border-bottom:2px solid ${BRAND.gold};">
              <span style="font-size:18px;font-weight:600;color:${BRAND.ink};">Miyo Global</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${BRAND.inkMuted};font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:${BRAND.sunken};border-top:1px solid ${BRAND.border};">
              <p class="footer-text" style="margin:0 0 6px 0;font-size:13px;color:${BRAND.inkMuted};">
                You received this email because you have a Miyo Global CRM account.
              </p>
              <p class="footer-text" style="margin:0;font-size:13px;color:${BRAND.inkMuted};">
                Questions? Write to <a href="mailto:support@miyoglobal.com" class="footer-link" style="color:${BRAND.ink};">support@miyoglobal.com</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
