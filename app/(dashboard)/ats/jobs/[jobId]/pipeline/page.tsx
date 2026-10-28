import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { candidateApplications, candidates, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { jobCapabilities } from "@/lib/ats/access";
import { stagesForJob } from "@/lib/ats/stages";
import { refuseReasons } from "@/lib/ats/refuse-reasons";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PipelineBoard } from "@/features/ats/pipeline/pipeline-board";

export const dynamic = "force-dynamic";

/** MIYO-0651: the board for one job. */
export default async function JobPipelinePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;

  const jobId = Number((await params).jobId);
  if (!Number.isInteger(jobId)) notFound();

  const capabilities = await jobCapabilities({ userId, orgId, role: member.role }, jobId);
  if (!capabilities.has("view")) notFound();

  const job = await db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, orgId)),
  });
  if (!job) notFound();

  const [stages, reasons, rows] = await Promise.all([
    stagesForJob(orgId, jobId),
    refuseReasons(orgId),
    db
      .select({
        applicationId: candidateApplications.id,
        candidateId: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        rating: candidateApplications.rating,
        source: candidateApplications.source,
        stageId: candidateApplications.stageId,
        appliedAt: candidateApplications.appliedAt,
        state: candidateApplications.kanbanState,
        blockedReason: candidateApplications.kanbanReason,
        // Time in stage: the last move, or the application date.
        lastMovedAt: sql<Date | null>`(
          SELECT max(a.created_at) FROM ats_activity a
          WHERE a.application_id = ${candidateApplications.id} AND a.type = 'stage_moved'
        )`,
      })
      .from(candidateApplications)
      .innerJoin(candidates, eq(candidates.id, candidateApplications.candidateId))
      .where(eq(candidateApplications.jobPostingId, jobId))
      .orderBy(desc(candidateApplications.appliedAt)),
  ]);

  const firstStageId = stages.find((s) => s.type === "APPLIED")?.id ?? stages[0]?.id ?? null;
  // eslint-disable-next-line react-hooks/purity -- async Server Component, rendered per request
  const now = Date.now();
  const cards = rows.map((row) => {
    const since = row.lastMovedAt ?? row.appliedAt;
    return {
      applicationId: row.applicationId,
      candidateId: row.candidateId,
      name: `${row.firstName} ${row.lastName}`.trim(),
      rating: row.rating,
      source: row.source,
      // An application from before stages existed sits in the first column.
      stageId: row.stageId ?? firstStageId,
      state: row.state ?? "READY",
      blockedReason: row.blockedReason,
      daysInStage: since ? Math.floor((now - new Date(since).getTime()) / 86_400_000) : 0,
    };
  });

  return (
    <PageWrapper title={job.title} subtitle="Pipeline">
      <PipelineBoard
        stages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          autoEmail: s.autoEmail,
          emailTemplateId: s.emailTemplateId,
        }))}
        cards={cards}
        reasons={reasons.map((r) => ({
          id: r.id,
          name: r.name,
          emailTemplateId: r.emailTemplateId,
        }))}
      />
    </PageWrapper>
  );
}
