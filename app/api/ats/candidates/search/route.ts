import type { NextRequest } from "next/server";
import { and, desc, eq, gte, inArray, or, sql, type SQLWrapper } from "drizzle-orm";

import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsCandidateTagLinks,
  candidateApplications,
  candidates,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { hasSearchTerms, ilikePattern } from "@/lib/ats/candidate-search";

/**
 * The generated tsvector column (migration 0166) is not in the Drizzle
 * schema — Drizzle has no generated-column type — so it is named directly.
 */
const searchVector = sql`candidates.search`;

/**
 * MIYO-0643: candidate search. The tsvector column does the work; an
 * escaped ILIKE runs beside it so a part-word or an email still matches.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    const params = req.nextUrl.searchParams;
    const query = params.get("q");
    const jobId = Number(params.get("jobId"));
    const stageId = Number(params.get("stageId"));
    const tagId = Number(params.get("tagId"));
    const source = params.get("source");
    // MIYO-0646: the talent pool is everyone with no live application.
    const poolOnly = params.get("pool") === "1";
    const since = params.get("since");
    const limit = Math.min(Number(params.get("limit")) || 50, 200);

    const { allowed, jobIds: allowedJobIds } = await atsPageAccess({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (!allowed) return err("Not found.", 404);

    const filters: (SQLWrapper | undefined)[] = [eq(candidates.orgId, session.orgId)];

    if (hasSearchTerms(query)) {
      const term = query as string;
      filters.push(
        or(
          sql`${searchVector} @@ websearch_to_tsquery('english', ${term})`,
          sql`${candidates.email} ILIKE ${ilikePattern(term)} ESCAPE '\\'`,
          sql`(${candidates.firstName} || ' ' || ${candidates.lastName}) ILIKE ${ilikePattern(term)} ESCAPE '\\'`,
        ),
      );
    }
    if (source) filters.push(eq(candidates.source, source));
    if (since && !Number.isNaN(Date.parse(since))) {
      filters.push(gte(candidates.createdAt, new Date(since)));
    }
    if (poolOnly) {
      filters.push(
        sql`NOT EXISTS (
          SELECT 1 FROM candidate_applications a
          WHERE a.candidate_id = ${candidates.id}
            AND a.status NOT IN ('REJECTED', 'WITHDRAWN')
        )`,
      );
    }
    if (Number.isInteger(tagId)) {
      filters.push(
        sql`EXISTS (SELECT 1 FROM ${atsCandidateTagLinks} l WHERE l.candidate_id = ${candidates.id} AND l.tag_id = ${tagId})`,
      );
    }

    // A candidate is visible through their applications, so the job scope
    // and the stage filter are both conditions on candidate_applications.
    const applicationFilters: SQLWrapper[] = [];
    if (Number.isInteger(jobId)) applicationFilters.push(sql`a.job_posting_id = ${jobId}`);
    if (Number.isInteger(stageId)) applicationFilters.push(sql`a.stage_id = ${stageId}`);
    if (allowedJobIds) {
      applicationFilters.push(
        sql`a.job_posting_id IN (${sql.join(
          allowedJobIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    }
    if (applicationFilters.length > 0) {
      filters.push(
        sql`EXISTS (SELECT 1 FROM candidate_applications a WHERE a.candidate_id = ${candidates.id} AND ${sql.join(applicationFilters, sql` AND `)})`,
      );
    }

    const rank = hasSearchTerms(query)
      ? sql<number>`ts_rank(${searchVector}, websearch_to_tsquery('english', ${query as string}))`
      : sql<number>`0`;

    const rows = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phone: candidates.phone,
        source: candidates.source,
        status: candidates.status,
        rating: candidates.rating,
        createdAt: candidates.createdAt,
        rank,
      })
      .from(candidates)
      .where(and(...filters))
      .orderBy(desc(rank), desc(candidates.createdAt))
      .limit(limit);

    if (rows.length === 0) return ok([]);

    // One extra query for the jobs each of them applied to, rather than a
    // join that multiplies the rows.
    const applications = await db
      .select({
        candidateId: candidateApplications.candidateId,
        jobTitle: jobPostings.title,
      })
      .from(candidateApplications)
      .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
      .where(
        inArray(
          candidateApplications.candidateId,
          rows.map((r) => r.id),
        ),
      );

    const jobsByCandidate = new Map<number, string[]>();
    for (const row of applications) {
      const list = jobsByCandidate.get(row.candidateId) ?? [];
      list.push(row.jobTitle);
      jobsByCandidate.set(row.candidateId, list);
    }

    return ok(
      rows.map((row) => ({ ...row, jobs: jobsByCandidate.get(row.id) ?? [] })),
    );
  }, req);
}
