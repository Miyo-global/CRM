import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsEmailTemplates } from "@/lib/db/schema";
import { getEmailTemplate } from "@/lib/email-templates/base";
import { renderEmail, type EmailTemplateId, type EmailVars } from "@/lib/email-templates/render";
import { markdownToEmailHtml, markdownToPlainText } from "./markdown";

/**
 * MIYO-0673: HR can reword an ats-* mail per org. Only the subject and the
 * body are theirs; the frame, the header and the footer come from the same
 * place as every other mail, so an edit cannot break the layout.
 */
export async function renderAtsEmail(
  orgId: string,
  templateId: EmailTemplateId,
  vars: EmailVars,
): Promise<{ subject: string; html: string; text: string }> {
  const override = await db.query.atsEmailTemplates.findFirst({
    where: and(
      eq(atsEmailTemplates.orgId, orgId),
      eq(atsEmailTemplates.templateId, templateId),
    ),
  });

  const standard = renderEmail(templateId, vars);
  if (!override?.body?.trim() && !override?.subject?.trim()) return standard;

  const fill = (text: string) =>
    text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_m, key: string) => {
      const value = vars[key];
      return value === null || value === undefined ? "" : String(value);
    });

  const subject = override.subject?.trim() ? fill(override.subject) : standard.subject;
  if (!override.body?.trim()) return { ...standard, subject };

  const body = fill(override.body);
  return {
    subject,
    html: getEmailTemplate({
      title: subject,
      preheader: standard.preheader,
      content: markdownToEmailHtml(body),
    }),
    text: markdownToPlainText(body),
  };
}
