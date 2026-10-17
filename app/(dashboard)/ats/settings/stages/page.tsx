import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { orgStages } from "@/lib/ats/stages";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StageEditor } from "@/features/ats/settings/stage-editor";

export const dynamic = "force-dynamic";

/** MIYO-0650: the org's pipeline. */
export default async function AtsStagesPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const stages = await orgStages(orgId);

  return (
    <PageWrapper title="Pipeline stages" subtitle="What every job's board looks like">
      <StageEditor
        stages={stages.map((s) => ({ id: s.id, name: s.name, type: s.type, sort: s.sort }))}
      />
    </PageWrapper>
  );
}
