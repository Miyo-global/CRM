import { appUrl } from "@/lib/app-url";
import { escapeHtml } from "@/lib/email-templates/base";
import { BRAND } from "@/lib/design/brand-hex";

export function buildNotificationEmail(opts: {
  title: string;
  message: string;
  link?: string | null;
}): { subject: string; html: string } {
  const safeLink = opts.link && opts.link.startsWith("/") ? opts.link : null;
  const subject = `${opts.title}`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:${BRAND.white};padding:20px 24px;border-bottom:2px solid ${BRAND.gold};">
      <h1 style="color:${BRAND.ink};margin:0;font-size:18px;">Miyo Global</h1>
    </div>
    <div style="background:${BRAND.white};padding:24px;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 10px 10px;">
      <h2 style="color:${BRAND.ink};margin-top:0;">${escapeHtml(opts.title)}</h2>
      <p style="white-space:pre-line;">${escapeHtml(opts.message)}</p>
      ${safeLink ? `<div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(appUrl + safeLink)}" style="background:${BRAND.ink};color:${BRAND.gold};padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Details</a>
      </div>` : ""}
    </div>
  </body></html>`;
  return { subject, html };
}
