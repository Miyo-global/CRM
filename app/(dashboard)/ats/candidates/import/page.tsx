import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CandidateImport } from "@/features/ats/candidates/candidate-import";

export const dynamic = "force-dynamic";

/** MIYO-0649: bring a list in. */
export default async function ImportCandidatesPage() {
  if (!ATS_MODULE_ENABLED) notFound();
  const authed = await requireAuth();
  if ("error" in authed) notFound();
  if (!isAtsRole(authed.member.role)) notFound();

  return (
    <PageWrapper title="Import candidates" subtitle="From a CSV, with a dry run first">
      <CandidateImport />
    </PageWrapper>
  );
}
