import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  interviewScorecards,
  interviews,
  candidateApplications,
  jobPostings,
  candidates,
  hiringFlowTemplates,
  hiringFlowRounds,
  candidateSlaTracking,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { sendCandidateStageEmail } from "@/lib/email";

const submitScorecardSchema = z.object({
  ratings: z.record(z.string(), z.number().min(0).max(10)),
  recommendation: z.enum(["HIRE", "NO_HIRE", "MAYBE"]),
  notes: z.string().optional(),
  templateId: z.number().int().positive().optional(),
  isBlindMode: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: idParam } = await params;
    const interviewId = Number(idParam);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const scorecard = await db.query.interviewScorecards.findFirst({
      where: and(
        eq(interviewScorecards.interviewId, interviewId),
        eq(interviewScorecards.interviewerId, session.user.id)
      ),
    });

    if (!scorecard) {
      return ok(null);
    }

    return ok(scorecard);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const { interviewId: idParam } = await params;
    const interviewId = Number(idParam);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const isAssignedInterviewer =
      interview.interviewerId === session.user.id ||
      (interview.panelInterviewerIds ?? []).includes(session.user.id);
    if (!isAssignedInterviewer) {
      return err("Only assigned interviewers can submit a scorecard.", 403);
    }

    const existing = await db.query.interviewScorecards.findFirst({
      where: and(
        eq(interviewScorecards.interviewId, interviewId),
        eq(interviewScorecards.interviewerId, session.user.id)
      ),
    });
    if (existing?.submittedAt) {
      return err("Scorecard already submitted.", 403);
    }

    const body = await parseBody(req, submitScorecardSchema);

    const isFirstSubmit = !existing?.submittedAt;

    if (existing) {
      const [updated] = await db
        .update(interviewScorecards)
        .set({
          ratings: body.ratings,
          recommendation: body.recommendation,
          notes: body.notes ?? null,
          ...(body.templateId !== undefined && { templateId: body.templateId }),
          ...(body.isBlindMode !== undefined && { isBlindMode: body.isBlindMode }),
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(interviewScorecards.id, existing.id))
        .returning();

      if (isFirstSubmit) {
        void inngest
          .send({
            name: "hr/interview.scorecard.submitted",
            data: { interviewId, orgId: session.orgId, candidateId: interview.candidateId },
          })
          .catch(() => {});

        if (interview.applicationId && interview.roundIndex != null) {
          void autoAdvanceApplication(
            interview.applicationId,
            interview.roundIndex,
            body.recommendation,
            session.orgId,
          ).catch(() => {});
        }
      }

      return ok(updated);
    }

    const [scorecard] = await db
      .insert(interviewScorecards)
      .values({
        interviewId,
        interviewerId: session.user.id,
        templateId: body.templateId ?? null,
        ratings: body.ratings,
        recommendation: body.recommendation,
        notes: body.notes ?? null,
        isBlindMode: body.isBlindMode ?? false,
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [interviewScorecards.interviewId, interviewScorecards.interviewerId],
        set: {
          templateId: body.templateId ?? null,
          ratings: body.ratings,
          recommendation: body.recommendation,
          notes: body.notes ?? null,
          isBlindMode: body.isBlindMode ?? false,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (isFirstSubmit) {
      void inngest
        .send({
          name: "hr/interview.scorecard.submitted",
          data: { interviewId, orgId: session.orgId, candidateId: interview.candidateId },
        })
        .catch(() => {});

      if (interview.applicationId && interview.roundIndex != null) {
        void autoAdvanceApplication(
          interview.applicationId,
          interview.roundIndex,
          body.recommendation,
          session.orgId,
        ).catch(() => {});
      }
    }

    return ok(scorecard, 201);
  });
}

async function autoAdvanceApplication(
  applicationId: number,
  completedRoundIndex: number,
  recommendation: "HIRE" | "NO_HIRE" | "MAYBE",
  orgId: string,
) {
  if (recommendation === "MAYBE") return;

  const app = await db.query.candidateApplications.findFirst({
    where: and(eq(candidateApplications.id, applicationId), eq(candidateApplications.orgId, orgId)),
  });
  if (!app) return;

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, app.candidateId),
    columns: { firstName: true, lastName: true, email: true, status: true },
  });
  const job = await db.query.jobPostings.findFirst({
    where: eq(jobPostings.id, app.jobPostingId),
    columns: { title: true, hiringFlowTemplateId: true },
  });
  if (!candidate || !job) return;

  if (candidate.status === "HIRED" || candidate.status === "REJECTED") return;

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const jobTitle = job.title;

  let pipelineStage: string;
  let candidateStatus: "INTERVIEW" | "OFFER" | "REJECTED";
  let roundName: string | undefined;
  let roundNumber: number | undefined;
  let durationMinutes: number | undefined;
  let mode: string | undefined;

  if (recommendation === "NO_HIRE") {
    pipelineStage = "REJECTED";
    candidateStatus = "REJECTED";
  } else {
    const nextRoundOrder = completedRoundIndex + 1;
    let nextRound = null;
    if (job.hiringFlowTemplateId) {
      nextRound = await db.query.hiringFlowRounds.findFirst({
        where: and(
          eq(hiringFlowRounds.templateId, job.hiringFlowTemplateId),
          eq(hiringFlowRounds.roundOrder, nextRoundOrder),
        ),
        orderBy: [asc(hiringFlowRounds.roundOrder)],
      });
    }
    if (nextRound) {
      pipelineStage = `ROUND_${nextRound.roundOrder}`;
      candidateStatus = "INTERVIEW";
      roundName = nextRound.name;
      roundNumber = nextRound.roundOrder;
      durationMinutes = nextRound.durationMinutes ?? 60;
      mode = nextRound.mode ?? "VIDEO";
    } else {
      pipelineStage = "OFFER";
      candidateStatus = "OFFER";
    }
  }

  const stageHistory = [
    ...(app.stageHistory ?? []),
    { stage: pipelineStage, changedAt: new Date().toISOString(), changedBy: "system" },
  ];

  await db.transaction(async (tx) => {
    await tx
      .update(candidateApplications)
      .set({ pipelineStage, stageHistory, updatedAt: new Date() })
      .where(eq(candidateApplications.id, applicationId));

    await tx
      .update(candidates)
      .set({ status: candidateStatus, updatedAt: new Date() })
      .where(eq(candidates.id, app.candidateId));

    if (candidateStatus === "REJECTED") {
      await tx
        .update(candidateSlaTracking)
        .set({ status: "COMPLETE", updatedAt: new Date() })
        .where(eq(candidateSlaTracking.candidateId, app.candidateId));
    } else if (candidateStatus === "OFFER") {
      const [existingSla] = await tx
        .select({ id: candidateSlaTracking.id })
        .from(candidateSlaTracking)
        .where(
          and(
            eq(candidateSlaTracking.candidateId, app.candidateId),
            eq(candidateSlaTracking.stage, "OFFER"),
          )
        )
        .limit(1);

      if (existingSla) {
        await tx
          .update(candidateSlaTracking)
          .set({ enteredAt: new Date(), breachedAt: null, status: "ON_TRACK", updatedAt: new Date() })
          .where(eq(candidateSlaTracking.id, existingSla.id));
      } else {
        await tx.insert(candidateSlaTracking).values({
          orgId,
          candidateId: app.candidateId,
          stage: "OFFER",
          enteredAt: new Date(),
          status: "ON_TRACK",
          updatedAt: new Date(),
        });
      }
    }
  });

  if (candidate.email) {
    await sendCandidateStageEmail(candidate.email, pipelineStage, {
      candidateName,
      jobTitle,
      roundName,
      roundNumber,
      durationMinutes,
      mode,
      attendedInterview: true,
    });
  }
}
