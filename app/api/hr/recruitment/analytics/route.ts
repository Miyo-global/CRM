import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, candidateSlaTracking, jobPostings } from "@/lib/db/schema";
import { eq, and, count, sql, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STAGES = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;

export async function GET() {
  return withAuth(async (session) => {
    const orgId = session.orgId;

    const timeToHireData = await db
      .select({
        stage: candidateSlaTracking.stage,
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${candidateSlaTracking.updatedAt} - ${candidateSlaTracking.enteredAt})) / 3600)`,
        count: count(),
      })
      .from(candidateSlaTracking)
      .where(eq(candidateSlaTracking.orgId, orgId))
      .groupBy(candidateSlaTracking.stage);

    const pipelineVelocity = await db
      .select({
        status: candidates.status,
        count: count(),
      })
      .from(candidates)
      .where(eq(candidates.orgId, orgId))
      .groupBy(candidates.status);

    const [totalResult] = await db
      .select({ total: count() })
      .from(candidates)
      .where(eq(candidates.orgId, orgId));

    const [hiredResult] = await db
      .select({ hired: count() })
      .from(candidates)
      .where(and(eq(candidates.orgId, orgId), eq(candidates.status, "HIRED")));

    const total = Number(totalResult?.total ?? 0);
    const hired = Number(hiredResult?.hired ?? 0);
    const hireRate = total > 0 ? Math.round((hired / total) * 100) : 0;

    const stageTimes = Object.fromEntries(
      timeToHireData.map((r) => [r.stage, { avgHours: Number(r.avgHours ?? 0), count: Number(r.count) }])
    );

    const funnel = STAGES.map((stage) => {
      const stageCount = pipelineVelocity.find((v) => v.status === stage);
      const stageTiming = stageTimes[stage];
      return {
        stage,
        count: Number(stageCount?.count ?? 0),
        avgDaysInStage: stageTiming ? Math.round(stageTiming.avgHours / 24 * 10) / 10 : null,
      };
    });

    return ok({
      funnel,
      hireRate,
      totalCandidates: total,
      totalHired: hired,
    });
  });
}
