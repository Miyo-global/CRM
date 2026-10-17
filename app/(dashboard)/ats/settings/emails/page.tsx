import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsEmailTemplates } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { EMAIL_CATALOG, type EmailTemplateId } from "@/lib/email-templates/catalog.generated";
import { templatePlaceholders } from "@/lib/email-templates/render";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmailTemplateEditor } from "@/features/ats/settings/email-template-editor";

export const dynamic = "force-dynamic";

/** The mails a candidate receives; the internal ones are not editable. */
const EDITABLE: EmailTemplateId[] = [
  "ats-application-received",
  "ats-application-rejected",
  "ats-interview-invite",
  "ats-interview-reminder",
  "ats-offer",
];

/** MIYO-0673: HR's own wording for the candidate-facing mails. */
export default async function AtsEmailSettingsPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const overrides = await db
    .select()
    .from(atsEmailTemplates)
    .where(eq(atsEmailTemplates.orgId, orgId));
  const byId = new Map(overrides.map((o) => [o.templateId, o]));

  const templates = EDITABLE.map((templateId) => ({
    templateId,
    defaultSubject: EMAIL_CATALOG[templateId].subject,
    subject: byId.get(templateId)?.subject ?? null,
    body: byId.get(templateId)?.body ?? null,
    placeholders: templatePlaceholders(templateId),
  }));

  return (
    <PageWrapper
      title="Candidate emails"
      subtitle="Your wording, or ours. The header and footer stay the same."
    >
      <EmailTemplateEditor templates={templates} />
    </PageWrapper>
  );
}
