import type { NextRequest } from "next/server";
import { and, avg, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  candidateApplications,
  interviewScorecards,
  interviews,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";

export const RECOMMENDATIONS = [
  "STRONG_NO",
  "NO",
  "MAYBE",
  "YES",
  "STRONG_YES",
] as const;

const bodySchema = z.object({
  ratings: z.record(z.string(), z.coerce.number().int().min(1).max(5)),
  recommendation: z.enum(RECOMMENDATIONS),
  notes: z.string().trim().max(5000).optional(),
});

/** The average of a 1–5 scorecard, as the card on the board shows it. */
function averageRating(ratings: Record<string, number>): number | null {
  const values = Object.values(ratings);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * MIYO-0658: other people's scorecards stay hidden until this interviewer
 * has submitted their own, so one opinion does not colour the next.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const interviewId = Number((await params).interviewId);
    if (!Number.isInteger(interviewId)) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
    if (
      interview.jobPostingId &&
      !(await canOnJob(actor, interview.jobPostingId, "submit_scorecard"))
    ) {
      return err("Forbidden", 403);
    }

    const rows = await db
      .select({
        id: interviewScorecards.id,
        interviewerId: interviewScorecards.interviewerId,
        interviewerName: users.name,
        ratings: interviewScorecards.ratings,
        recommendation: interviewScorecards.recommendation,
        notes: interviewScorecards.notes,
        submittedAt: interviewScorecards.submittedAt,
      })
      .from(interviewScorecards)
      .leftJoin(users, eq(users.id, interviewScorecards.interviewerId))
      .where(eq(interviewScorecards.interviewId, interviewId));

    const mine = rows.find((row) => row.interviewerId === session.user.id);
    const iHaveSubmitted = Boolean(mine?.submittedAt);

    return ok({
      mine: mine ?? null,
      others: iHaveSubmitted
        ? rows.filter((row) => row.interviewerId !== session.user.id)
        : [],
      othersHidden: iHaveSubmitted
        ? 0
        : rows.filter((row) => row.interviewerId !== session.user.id).length,
    });
  }, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const interviewId = Number((await params).interviewId);
    if (!Number.isInteger(interviewId)) return err("Invalid interview ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const interview = await db.query.interviews.findFirst({
        where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
      });
      if (!interview) return err("Interview not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (
        interview.jobPostingId &&
        !(await canOnJob(actor, interview.jobPostingId, "submit_scorecard"))
      ) {
        return err("Forbidden", 403);
      }

      const [saved] = await db
        .insert(interviewScorecards)
        .values({
          interviewId,
          interviewerId: session.user.id,
          ratings: body.ratings,
          recommendation: body.recommendation,
          notes: body.notes ?? null,
          submittedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [interviewScorecards.interviewId, interviewScorecards.interviewerId],
          set: {
            ratings: body.ratings,
            recommendation: body.recommendation,
            notes: body.notes ?? null,
            submittedAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();

      // The interview's own rating is the average of this scorecard; the
      // application's is the average across every interview in the round.
      const mine = averageRating(body.ratings);
      if (mine !== null) {
        await db.update(interviews).set({ rating: mine }).where(eq(interviews.id, interviewId));

        const [{ value }] = await db
          .select({ value: avg(interviews.rating) })
          .from(interviews)
          .where(eq(interviews.candidateId, interview.candidateId));
        if (value !== null && interview.jobPostingId) {
          await db
            .update(candidateApplications)
            .set({ rating: Math.round(Number(value)) })
            .where(
              and(
                eq(candidateApplications.candidateId, interview.candidateId),
                eq(candidateApplications.jobPostingId, interview.jobPostingId),
              ),
            );
        }
      }

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: interview.candidateId,
        actorId: session.user.id,
        type: "scorecard_submitted",
        data: { interviewId, recommendation: body.recommendation },
      });

      return ok(saved, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid scorecard.", 400);
      throw e;
    }
  }, req);
}
