import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, jobPostings } from "@/lib/db/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    const baseWhere = jobId
      ? and(eq(candidates.orgId, session.orgId), sql`${candidates.id} IN (SELECT candidate_id FROM candidate_applications WHERE job_posting_id = ${Number(jobId)})`)
      : eq(candidates.orgId, session.orgId);

    const genderRows = await db
      .select({
        gender: candidates.gender,
        count: sql<number>`count(*)::int`,
      })
      .from(candidates)
      .where(and(baseWhere, isNotNull(candidates.gender)))
      .groupBy(candidates.gender);

    const genderBreakdown = genderRows.map((r) => ({
      gender: r.gender ?? "Unknown",
      count: r.count,
    }));

    const locationRows = await db
      .select({
        location: candidates.location,
        count: sql<number>`count(*)::int`,
      })
      .from(candidates)
      .where(and(baseWhere, isNotNull(candidates.location)))
      .groupBy(candidates.location)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    const locationBreakdown = locationRows.map((r) => ({
      location: r.location ?? "Unknown",
      count: r.count,
    }));

    const sourceRows = await db
      .select({
        source: candidates.source,
        count: sql<number>`count(*)::int`,
      })
      .from(candidates)
      .where(baseWhere)
      .groupBy(candidates.source)
      .orderBy(sql`count(*) DESC`);

    const sourceBreakdown = sourceRows.map((r) => ({
      source: r.source ?? "Unknown",
      count: r.count,
    }));

    const stageRows = await db
      .select({
        status: candidates.status,
        count: sql<number>`count(*)::int`,
      })
      .from(candidates)
      .where(baseWhere)
      .groupBy(candidates.status);

    const stageBreakdown = stageRows.map((r) => ({
      stage: r.status ?? "Unknown",
      count: r.count,
    }));

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidates)
      .where(baseWhere);

    return ok({
      total: totalRow?.count ?? 0,
      genderBreakdown,
      locationBreakdown,
      sourceBreakdown,
      stageBreakdown,
    });
  });
}
