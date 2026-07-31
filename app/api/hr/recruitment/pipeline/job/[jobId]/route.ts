import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidateApplications,
  candidates,
  jobPostings,
  hiringFlowTemplates,
  hiringFlowRounds,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { sendCandidateStageEmail } from "@/lib/email";

const patchSchema = z.object({
  applicationId: z.number().int().positive(),
  stage: z.string().min(1),
  sendEmail: z.boolean().optional().default(false),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  return withAuth(async (session) => {
    const { jobId } = await params;
    const jobIdNum = Number(jobId);

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobIdNum), eq(jobPostings.orgId, session.orgId)),
    });
    if (!job) return err("Job not found.", 404);

    let hiringFlow: { id: number; name: string; rounds: { id: number; roundOrder: number; name: string; type: string; mode: string | null; durationMinutes: number | null }[] } | null = null;
    if (job.hiringFlowTemplateId) {
      const template = await db.query.hiringFlowTemplates.findFirst({
        where: and(
          eq(hiringFlowTemplates.id, job.hiringFlowTemplateId),
          eq(hiringFlowTemplates.orgId, session.orgId),
        ),
        with: { rounds: { orderBy: [asc(hiringFlowRounds.roundOrder)] } },
      });
      if (template) hiringFlow = template;
    }

    const apps = await db
      .select({
        id: candidateApplications.id,
        candidateId: candidateApplications.candidateId,
        pipelineStage: candidateApplications.pipelineStage,
        currentRoundIndex: candidateApplications.currentRoundIndex,
        appliedAt: candidateApplications.appliedAt,
        status: candidateApplications.status,
        notes: candidateApplications.notes,
        candidateName: candidates.firstName,
        candidateLastName: candidates.lastName,
        candidateEmail: candidates.email,
        candidatePhone: candidates.phone,
        candidateSource: candidates.source,
        candidateRating: candidates.rating,
        candidateResumeUrl: candidates.resumeUrl,
      })
      .from(candidateApplications)
      .innerJoin(candidates, eq(candidateApplications.candidateId, candidates.id))
      .where(
        and(
          eq(candidateApplications.jobPostingId, jobIdNum),
          eq(candidateApplications.orgId, session.orgId),
        ),
      );

    const stageOrder = buildStageOrder(hiringFlow);

    const grouped: Record<string, typeof apps> = {};
    for (const s of stageOrder) grouped[s.id] = [];
    for (const app of apps) {
      const stage = app.pipelineStage ?? "APPLIED";
      if (grouped[stage]) grouped[stage].push(app);
      else grouped["APPLIED"].push(app);
    }

    const stages = stageOrder.map((s) => ({
      stage: s.id,
      label: s.label,
      candidates: (grouped[s.id] ?? []).map((a) => ({
        id: a.id,
        candidateId: a.candidateId,
        name: `${a.candidateName} ${a.candidateLastName}`,
        email: a.candidateEmail,
        phone: a.candidatePhone,
        source: a.candidateSource,
        rating: a.candidateRating,
        resumeUrl: a.candidateResumeUrl,
        appliedAt: a.appliedAt,
        pipelineStage: a.pipelineStage,
        currentRoundIndex: a.currentRoundIndex,
        notes: a.notes,
      })),
    }));

    return ok({ job, hiringFlow, stages });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  return withAuth(async (session) => {
    const { jobId } = await params;
    const body = await parseBody(req, patchSchema);

    const app = await db.query.candidateApplications.findFirst({
      where: and(
        eq(candidateApplications.id, body.applicationId),
        eq(candidateApplications.jobPostingId, Number(jobId)),
        eq(candidateApplications.orgId, session.orgId),
      ),
    });
    if (!app) return err("Application not found.", 404);

    const stageHistory = [
      ...(app.stageHistory ?? []),
      { stage: body.stage, changedAt: new Date().toISOString(), changedBy: session.user.id },
    ];

    await db
      .update(candidateApplications)
      .set({ pipelineStage: body.stage, stageHistory, updatedAt: new Date() })
      .where(eq(candidateApplications.id, body.applicationId));

    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, app.candidateId),
      columns: { firstName: true, lastName: true, email: true },
    });
    const job = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, Number(jobId)),
      columns: { title: true, hiringFlowTemplateId: true },
    });

    if (candidate && job && !body.stage.startsWith("ROUND_") && body.sendEmail) {
      sendCandidateStageEmail(candidate.email, body.stage, {
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobTitle: job.title,
      }).catch(() => {});
    }

    return ok({ applicationId: body.applicationId, stage: body.stage });
  });
}

function buildStageOrder(
  flow: { rounds: { id: number; roundOrder: number; name: string }[] } | null,
): { id: string; label: string }[] {
  const roundStages: { id: string; label: string }[] = flow
    ? flow.rounds.map((r) => ({ id: `ROUND_${r.roundOrder}`, label: r.name }))
    : [];

  return [
    { id: "APPLIED", label: "Applied" },
    { id: "SHORTLISTED", label: "Shortlisted" },
    ...roundStages,
    { id: "OFFER", label: "Offer" },
    { id: "HIRED", label: "Hired" },
    { id: "REJECTED", label: "Rejected" },
  ];
}
