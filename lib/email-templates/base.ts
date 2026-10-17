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

const FONT = "font-family:Arial,Helvetica,sans-serif;";

/**
 * Inline styles for the classes older templates still use. Many clients
 * (Gmail apps, Outlook) drop <style> blocks, so the shell inlines everything
 * (MIYO-0097). Styles match email-templates/*.html.
 */
const CLASS_STYLES: Record<string, string> = {
  "email-title": `margin:0 0 16px 0;${FONT}font-size:22px;line-height:30px;font-weight:bold;color:${BRAND.ink};`,
  "email-text": `margin:0 0 16px 0;${FONT}font-size:15px;line-height:24px;color:${BRAND.ink};`,
  "email-button": `display:inline-block;margin:8px 0 16px 0;padding:12px 24px;background:${BRAND.gold};${FONT}font-size:15px;line-height:20px;font-weight:bold;color:${BRAND.ink};text-decoration:none;border-radius:6px;`,
  btn: `display:inline-block;margin:8px 0 16px 0;padding:12px 24px;background:${BRAND.gold};${FONT}font-size:15px;line-height:20px;font-weight:bold;color:${BRAND.ink};text-decoration:none;border-radius:6px;`,
  "credential-box": `margin:16px 0;padding:12px 16px;border-left:3px solid ${BRAND.gold};background:${BRAND.sunken};`,
  "credential-item": `margin:6px 0;${FONT}font-size:14px;line-height:20px;color:${BRAND.ink};`,
  "credential-label": `font-weight:bold;color:${BRAND.ink};`,
  "credential-value": `font-family:"Courier New",monospace;color:${BRAND.ink};`,
  divider: `height:1px;line-height:1px;font-size:0;margin:24px 0;background:${BRAND.border};`,
  "security-notice": `margin:16px 0;padding:12px 16px;border-left:3px solid ${BRAND.warning};background:${BRAND.warningSoft};`,
  "security-text": `margin:0;${FONT}font-size:13px;line-height:20px;color:${BRAND.warning};`,
  "footer-text": `margin:0;${FONT}font-size:12px;line-height:18px;color:${BRAND.inkMuted};`,
  "footer-link": `color:${BRAND.ink};`,
};

/** Swap known class attributes for inline styles, keeping any style already set. */
export function inlineEmailClasses(html: string): string {
  return html.replace(/<([a-zA-Z0-9]+)([^>]*?)\sclass="([^"]+)"([^>]*)>/g, (tag, name, before, classes, after) => {
    const css = (classes as string).split(/\s+/).map((c) => CLASS_STYLES[c] ?? "").join("");
    if (!css) return tag;
    const rest = `${before}${after}`;
    const existing = /\sstyle="([^"]*)"/.exec(rest);
    const merged = existing ? rest.replace(existing[0], ` style="${css}${existing[1]}"`) : `${rest} style="${css}"`;
    return `<${name}${merged}>`;
  });
}

export function getEmailTemplate({ title, preheader, content }: EmailTemplateProps): string {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.canvas};opacity:0;">${escapeHtml(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.canvas}" style="background:${BRAND.canvas};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:8px;">
<tr><td style="padding:20px 32px;background:${BRAND.ink};border-radius:8px 8px 0 0;">
<img src="${logoUrl}" width="120" alt="Miyo Global" style="display:block;border:0;outline:none;height:auto;max-width:120px;">
</td></tr>
<tr><td style="height:3px;line-height:3px;font-size:3px;background:${BRAND.gold};">&nbsp;</td></tr>
<tr><td style="padding:32px;${FONT}font-size:15px;line-height:24px;color:${BRAND.ink};">
${inlineEmailClasses(content)}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${BRAND.border};background:${BRAND.sunken};border-radius:0 0 8px 8px;">
<p style="margin:0;${FONT}font-size:12px;line-height:18px;color:${BRAND.inkMuted};">You received this email because you have a Miyo Global CRM account.</p>
<p style="margin:8px 0 0 0;${FONT}font-size:12px;line-height:18px;color:${BRAND.inkMuted};">Questions? Write to <a href="mailto:support@miyoglobal.com" style="color:${BRAND.ink};">support@miyoglobal.com</a>.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}
