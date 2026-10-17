import "server-only";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { atsEmailLog } from "@/lib/db/schema";
import { sendTemplateEmail } from "@/lib/email/sender";
import { EMAIL_CATALOG, type EmailTemplateId } from "@/lib/email-templates/catalog.generated";
import { logger } from "@/lib/logger";

interface StageEmailParams {
  orgId: string;
  candidate: { id: number; firstName: string; email: string };
  jobTitle: string;
}

/**
 * MIYO-0651, MIYO-0653: the mail a stage or a refuse reason carries. The
 * template id comes from the database, so it is checked against the
 * catalogue before anything is sent.
 */
export async function sendStageEmail(
  templateId: string,
  { orgId, candidate, jobTitle }: StageEmailParams,
): Promise<boolean> {
  if (!(templateId in EMAIL_CATALOG)) {
    logger.warn("Stage email template is not in the catalogue", { templateId });
    return false;
  }

  await sendTemplateEmail(templateId as EmailTemplateId, {
    to: candidate.email,
    category: "hr",
    vars: {
      first_name: candidate.firstName,
      job_title: jobTitle,
      careers_url: `${appUrl}/careers`,
    },
  });

  await db
    .insert(atsEmailLog)
    .values({
      orgId,
      candidateId: candidate.id,
      templateId,
      toEmail: candidate.email,
      status: "sent",
    })
    .catch((error) => logger.error("ATS email log failed", { templateId, error }));

  return true;
}
