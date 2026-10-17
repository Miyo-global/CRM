import "server-only";

import { sendEmail, type EmailAttachment } from "@/lib/email/sender";
import { renderEmail } from "@/lib/email-templates/render";
import { formatIST } from "@/lib/date-utils";

/**
 * MIYO-0154: one sender for the "here is your export" mails. The five HR
 * export routes each built their own HTML, so none of them carried the
 * branding, the plain-text part or the "do not forward" line that the
 * data-export-ready template has.
 *
 * The sender may override the subject and write their own note; everything
 * else comes from the template.
 */
export async function sendDataExportEmail(options: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  /** What was exported, e.g. "assets inventory (All)". */
  exportName: string;
  rowCount: number;
  /** CSV, XLSX, ZIP … shown to the reader. */
  fileType: string;
  /** The sender's own note, if they typed one. */
  message?: string;
  /** Subject typed by the sender; the template's subject is used otherwise. */
  subject?: string;
  attachments: EmailAttachment[];
}): Promise<void> {
  const { subject, html, text } = renderEmail("data-export-ready", {
    export_name: options.exportName,
    row_count: options.rowCount,
    file_type: options.fileType,
    requested_at: formatIST(new Date()),
    message: options.message?.trim() ?? "",
  });

  await sendEmail({
    to: options.to,
    subject: (options.subject?.trim() || subject).slice(0, 200),
    html,
    text,
    attachments: options.attachments,
    ...(options.cc ? { cc: options.cc } : {}),
    ...(options.bcc ? { bcc: options.bcc } : {}),
  });
}
