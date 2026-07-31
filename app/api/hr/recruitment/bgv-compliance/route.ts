
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, jobPostings } from "@/lib/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!["CEO", "ADMIN", "HR"].includes(role)) {
      return err("Forbidden", 403);
    }

    const cacheKey = `hr:bgv-compliance:${session.orgId}`;
    const data = await cached(cacheKey, async () => {
      const rows = await db
        .select({
          jobPostingId: candidateApplications.jobPostingId,
          jobTitle: jobPostings.title,
          total: count(candidateApplications.id),
          cleared: sql<number>`sum(case when ${candidates.bgvStatus} = 'CLEARED' then 1 else 0 end)::int`,
          failed: sql<number>`sum(case when ${candidates.bgvStatus} = 'FAILED' then 1 else 0 end)::int`,
          pending: sql<number>`sum(case when ${candidates.bgvStatus} = 'PENDING' then 1 else 0 end)::int`,
          initiated: sql<number>`sum(case when ${candidates.bgvStatus} = 'INITIATED' then 1 else 0 end)::int`,
          notInitiated: sql<number>`sum(case when ${candidates.bgvStatus} = 'NOT_INITIATED' or ${candidates.bgvStatus} is null then 1 else 0 end)::int`,
        })
        .from(candidateApplications)
        .innerJoin(candidates, eq(candidateApplications.candidateId, candidates.id))
        .innerJoin(jobPostings, eq(candidateApplications.jobPostingId, jobPostings.id))
        .where(
          and(
            eq(jobPostings.orgId, session.orgId),
            eq(candidates.orgId, session.orgId)
          )
        )
        .groupBy(candidateApplications.jobPostingId, jobPostings.title);

      return rows.map((r) => ({
        jobPostingId: r.jobPostingId,
        jobTitle: r.jobTitle,
        total: r.total,
        cleared: r.cleared ?? 0,
        failed: r.failed ?? 0,
        pending: r.pending ?? 0,
        initiated: r.initiated ?? 0,
        notInitiated: r.notInitiated ?? 0,
        clearedPct: r.total > 0 ? Math.round(((r.cleared ?? 0) / r.total) * 100) : 0,
      }));
    });

    return ok(data);
  });
}
