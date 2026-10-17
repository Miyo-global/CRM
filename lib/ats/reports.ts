import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * MIYO-0674 to MIYO-0676: the hiring numbers. Each one is a single SQL
 * query — the pipeline is small, but the work belongs in Postgres rather
 * than in a loop over every application.
 */

export interface TimeToHireRow extends Record<string, unknown> {
  jobId: number;
  jobTitle: string;
  hires: number;
  medianDays: number | null;
  averageDays: number | null;
}

export async function timeToHire(orgId: string): Promise<TimeToHireRow[]> {
  const result = await db.execute<TimeToHireRow>(sql`
    SELECT
      j.id AS "jobId",
      j.title AS "jobTitle",
      count(*)::int AS hires,
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (h.created_at - a.applied_at)) / 86400
      ) AS "medianDays",
      avg(EXTRACT(EPOCH FROM (h.created_at - a.applied_at)) / 86400) AS "averageDays"
    FROM candidate_applications a
    JOIN job_postings j ON j.id = a.job_posting_id
    JOIN LATERAL (
      SELECT min(created_at) AS created_at
      FROM ats_activity
      WHERE application_id = a.id AND type = 'hired'
    ) h ON h.created_at IS NOT NULL
    WHERE a.org_id = ${orgId}
    GROUP BY j.id, j.title
    ORDER BY hires DESC
  `);
  return (result as unknown as { rows?: TimeToHireRow[] }).rows ?? (result as unknown as TimeToHireRow[]);
}

export interface TimeInStageRow extends Record<string, unknown> {
  stage: string;
  moves: number;
  averageDays: number | null;
}

/** How long people sit in each stage, from one move to the next. */
export async function timeInStage(orgId: string): Promise<TimeInStageRow[]> {
  const result = await db.execute<TimeInStageRow>(sql`
    WITH moves AS (
      SELECT
        application_id,
        created_at,
        data->>'toStage' AS stage,
        lead(created_at) OVER (PARTITION BY application_id ORDER BY created_at) AS next_at
      FROM ats_activity
      WHERE org_id = ${orgId} AND type = 'stage_moved'
    )
    SELECT
      stage,
      count(*)::int AS moves,
      avg(EXTRACT(EPOCH FROM (coalesce(next_at, now()) - created_at)) / 86400) AS "averageDays"
    FROM moves
    WHERE stage IS NOT NULL
    GROUP BY stage
    ORDER BY moves DESC
  `);
  return (result as unknown as { rows?: TimeInStageRow[] }).rows ?? (result as unknown as TimeInStageRow[]);
}

export interface SourceRow extends Record<string, unknown> {
  source: string;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
}

export async function sourceEffectiveness(orgId: string): Promise<SourceRow[]> {
  const result = await db.execute<SourceRow>(sql`
    SELECT
      coalesce(a.source, c.source, 'Unknown') AS source,
      count(DISTINCT a.id)::int AS applications,
      count(DISTINCT i.id)::int AS interviews,
      count(DISTINCT o.id)::int AS offers,
      count(DISTINCT CASE WHEN a.status = 'ACCEPTED' THEN a.id END)::int AS hires
    FROM candidate_applications a
    JOIN candidates c ON c.id = a.candidate_id
    LEFT JOIN interviews i ON i.candidate_id = a.candidate_id AND i.job_posting_id = a.job_posting_id
    LEFT JOIN candidate_offers o ON o.candidate_id = a.candidate_id AND o.job_posting_id = a.job_posting_id
    WHERE a.org_id = ${orgId}
    GROUP BY 1
    ORDER BY applications DESC
  `);
  return (result as unknown as { rows?: SourceRow[] }).rows ?? (result as unknown as SourceRow[]);
}

export interface FunnelRow extends Record<string, unknown> {
  stage: string;
  sort: number;
  candidates: number;
}

/** Where people are now, in stage order, optionally for one job. */
export async function funnel(
  orgId: string,
  options: { jobId?: number; from?: Date; to?: Date } = {},
): Promise<FunnelRow[]> {
  const result = await db.execute<FunnelRow>(sql`
    SELECT s.name AS stage, min(s.sort)::int AS sort, count(a.id)::int AS candidates
    FROM ats_stages s
    LEFT JOIN candidate_applications a
      ON a.stage_id = s.id
      ${options.jobId ? sql`AND a.job_posting_id = ${options.jobId}` : sql``}
      ${options.from ? sql`AND a.applied_at >= ${options.from.toISOString()}` : sql``}
      ${options.to ? sql`AND a.applied_at <= ${options.to.toISOString()}` : sql``}
    WHERE s.org_id = ${orgId}
      ${options.jobId ? sql`AND (s.job_id = ${options.jobId} OR s.job_id IS NULL)` : sql`AND s.job_id IS NULL`}
    GROUP BY s.name
    ORDER BY sort
  `);
  return (result as unknown as { rows?: FunnelRow[] }).rows ?? (result as unknown as FunnelRow[]);
}
