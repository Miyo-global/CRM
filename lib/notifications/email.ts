import { appUrl } from "@/lib/app-url";
import { escapeHtml } from "@/lib/email-templates/base";

export function buildNotificationEmail(opts: {
  title: string;
  message: string;
  link?: string | null;
}): { subject: string; html: string } {
  const safeLink = opts.link && opts.link.startsWith("/") ? opts.link : null;
  const subject = `${opts.title} — Miyo Global`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#0f2b7f,#1e40af);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="color:#bd882c;margin:0;font-size:22px;">Miyo Global</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
      <h2 style="color:#1e40af;margin-top:0;">${escapeHtml(opts.title)}</h2>
      <p style="white-space:pre-line;">${escapeHtml(opts.message)}</p>
      ${safeLink ? `<div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(appUrl + safeLink)}" style="background:#0f2b7f;color:#bd882c;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">View Details</a>
      </div>` : ""}
    </div>
  </body></html>`;
  return { subject, html };
}
