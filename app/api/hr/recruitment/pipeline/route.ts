import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateSlaTracking } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CandidateStatus, AtsPipelineResponse, AtsPipelineStage, SlaCandidateStatus } from "@/types/hr";

const PIPELINE_STAGES: CandidateStatus[] = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
];

export async function GET() {
  return withAuth(async (session) => {
    const [allCandidates, slaRows] = await Promise.all([
      db.query.candidates.findMany({
        where: eq(candidates.orgId, session.orgId),
        orderBy: [desc(candidates.createdAt)],
        limit: 500,
        with: {
          applications: {
            with: { jobPosting: { columns: { id: true, title: true } } },
            limit: 1,
            orderBy: (apps, { desc: d }) => [d(apps.appliedAt)],
          },
        },
      }),
      db
        .select({
          candidateId: candidateSlaTracking.candidateId,
          stage: candidateSlaTracking.stage,
          status: candidateSlaTracking.status,
        })
        .from(candidateSlaTracking)
        .where(eq(candidateSlaTracking.orgId, session.orgId)),
    ]);

    const slaLookup = new Map<string, SlaCandidateStatus>();
    for (const row of slaRows) {
      slaLookup.set(`${row.candidateId}:${row.stage}`, row.status as SlaCandidateStatus);
    }

    const stages: AtsPipelineStage[] = PIPELINE_STAGES.map((stage) => ({
      stage,
      candidates: allCandidates
        .filter((c) => c.status === stage)
        .map((c) => {
          const latestApp = c.applications?.[0] ?? null;
          return {
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            phone: c.phone ?? null,
            source: c.source ?? null,
            rating: c.rating ?? null,
            jobTitle: latestApp?.jobPosting?.title ?? null,
            applicationId: latestApp?.id ?? null,
            appliedAt: c.createdAt ?? null,
            slaStatus: slaLookup.get(`${c.id}:${stage}`) ?? null,
            resumeUrl: c.resumeUrl ?? null,
            notes: c.notes ?? null,
          };
        }),
    }));

    return ok<AtsPipelineResponse>({ stages });
  });
}
