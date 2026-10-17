import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { candidateApplications, candidates, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { CandidateSearch } from "@/features/ats/candidates/candidate-search";

export const dynamic = "force-dynamic";

/** MIYO-0643: everyone who has applied, newest first, with search over them. */
export default async function AtsCandidatesPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;
  const { allowed: mayOpen, jobIds } = await atsPageAccess({ userId, orgId, role: member.role });
  if (!mayOpen) notFound();

  const rows =
    jobIds?.length === 0
      ? []
      : await db
          .select({
            id: candidates.id,
            firstName: candidates.firstName,
            lastName: candidates.lastName,
            email: candidates.email,
            phone: candidates.phone,
            source: candidates.source,
          })
          .from(candidates)
          .where(eq(candidates.orgId, orgId))
          .orderBy(desc(candidates.createdAt), desc(candidates.id))
          .limit(50);

  const applications =
    rows.length === 0
      ? []
      : await db
          .select({
            candidateId: candidateApplications.candidateId,
            jobTitle: jobPostings.title,
            jobId: jobPostings.id,
          })
          .from(candidateApplications)
          .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
          .where(
            inArray(
              candidateApplications.candidateId,
              rows.map((r) => r.id),
            ),
          );

  // Someone on one hiring team only sees the people who applied to their jobs.
  const allowed = jobIds ? new Set(jobIds) : null;
  const jobsByCandidate = new Map<number, string[]>();
  for (const row of applications) {
    if (allowed && !allowed.has(row.jobId)) continue;
    const list = jobsByCandidate.get(row.candidateId) ?? [];
    list.push(row.jobTitle);
    jobsByCandidate.set(row.candidateId, list);
  }

  const visible = rows
    .filter((row) => !allowed || jobsByCandidate.has(row.id))
    .map((row) => ({ ...row, jobs: jobsByCandidate.get(row.id) ?? [] }));

  return (
    <PageWrapper
      title="Candidates"
      subtitle="Everyone who has applied"
      actions={
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/ats/candidates/import">Import</Link>
          </Button>
          <Button asChild>
            <Link href="/ats/candidates/new">Add candidate</Link>
          </Button>
        </div>
      }
    >
      <CandidateSearch initial={visible} />
    </PageWrapper>
  );
}
