import { appUrl } from "@/lib/app-url";
import { escapeHtml, getEmailTemplate } from "@/lib/email-templates/base";

/**
 * Notification mail (marked-absent, leave pending, check-in, onboarded-HR…).
 *
 * This used to be its own minimal layout with a different header, a "View
 * Details" button and no footer, so the app sent two visibly different kinds
 * of email (QA-0040). It now renders through the shared base template.
 */
export function buildNotificationEmail(opts: {
  title: string;
  message: string;
  link?: string | null;
  /** Button label, when the mail links into the app. */
  ctaLabel?: string;
}): { subject: string; html: string } {
  const safeLink = opts.link && opts.link.startsWith("/") && !opts.link.startsWith("//")
    ? opts.link
    : null;

  const content = `
    <h2 class="email-title">${escapeHtml(opts.title)}</h2>
    <p class="email-text" style="white-space:pre-line">${escapeHtml(opts.message)}</p>
    ${
      safeLink
        ? `<p class="email-text"><a class="email-button" href="${escapeHtml(appUrl + safeLink)}">${escapeHtml(opts.ctaLabel ?? "Open in the portal")}</a></p>`
        : ""
    }
  `;

  return {
    subject: opts.title,
    html: getEmailTemplate({ title: opts.title, preheader: opts.message.slice(0, 120), content }),
  };
}
