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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background-color: ${BRAND.canvas};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .email-wrapper {
      width: 100%;
      background-color: ${BRAND.canvas};
      padding: 40px 0;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND.white};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px ${BRAND.border};
    }

    .email-header {
      background: linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.inkDeep} 100%);
      padding: 40px 48px;
      text-align: center;
    }

    .logo {
      width: 180px;
      height: auto;
      margin-bottom: 16px;
    }

    .email-body {
      padding: 48px;
      color: ${BRAND.inkMuted};
      line-height: 1.6;
    }

    .email-title {
      font-size: 24px;
      font-weight: 700;
      color: ${BRAND.ink};
      margin: 0 0 24px 0;
      line-height: 1.3;
    }

    .email-text {
      font-size: 16px;
      color: ${BRAND.inkMuted};
      margin: 0 0 16px 0;
      line-height: 1.6;
    }

    .email-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.inkDeep} 100%);
      color: ${BRAND.white} !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      transition: transform 0.2s;
    }

    .email-button:hover {
      transform: translateY(-2px);
    }

    .credential-box {
      background-color: ${BRAND.sunken};
      border-left: 4px solid ${BRAND.ink};
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }

    .credential-item {
      margin: 8px 0;
      font-size: 15px;
    }

    .credential-label {
      font-weight: 600;
      color: ${BRAND.ink};
    }

    .credential-value {
      color: ${BRAND.ink};
      font-family: 'Monaco', 'Courier New', monospace;
      background-color: ${BRAND.white};
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-left: 8px;
    }

    .divider {
      height: 1px;
      background-color: ${BRAND.border};
      margin: 32px 0;
    }

    .email-footer {
      background-color: ${BRAND.sunken};
      padding: 32px 48px;
      text-align: center;
      border-top: 1px solid ${BRAND.border};
    }

    .footer-text {
      font-size: 14px;
      color: ${BRAND.inkMuted};
      margin: 8px 0;
    }

    .footer-link {
      color: ${BRAND.ink};
      text-decoration: none;
      font-weight: 500;
    }

    .security-notice {
      background-color: ${BRAND.warningSoft};
      border-left: 4px solid ${BRAND.warning};
      padding: 16px;
      border-radius: 8px;
      margin: 24px 0;
    }

    .security-text {
      font-size: 14px;
      color: ${BRAND.warning};
      margin: 0;
    }

    @media only screen and (max-width: 600px) {
      .email-body, .email-header, .email-footer {
        padding: 32px 24px !important;
      }

      .email-title {
        font-size: 20px;
      }

      .email-text {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 style="color: ${BRAND.white}; font-size: 28px; font-weight: 700; margin: 0;">
          Miyo Global
        </h1>
      </div>

      <div class="email-body">
        ${content}
      </div>

      <div class="email-footer">
        <p class="footer-text">
          <strong>Miyo Global CRM</strong><br>
          Enterprise Resource Management System
        </p>
        <p class="footer-text">
          Need help? Contact us at <a href="mailto:support@miyoglobal.com" class="footer-link">support@miyoglobal.com</a>
        </p>
        <p class="footer-text" style="margin-top: 16px; font-size: 12px; color: ${BRAND.inkSubtle};">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
