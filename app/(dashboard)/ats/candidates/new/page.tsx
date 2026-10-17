import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CandidateForm } from "@/features/ats/candidates/candidate-form";

export const dynamic = "force-dynamic";

/** MIYO-0649: somebody who did not come through the careers site. */
export default async function NewCandidatePage() {
  if (!ATS_MODULE_ENABLED) notFound();
  const authed = await requireAuth();
  if ("error" in authed) notFound();
  if (!isAtsRole(authed.member.role)) notFound();

  return (
    <PageWrapper title="Add a candidate" subtitle="A referral, an agency, a conversation">
      <CandidateForm />
    </PageWrapper>
  );
}
