import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsActivity, candidates, interviews, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { interviewerContacts, sendInterviewInvite } from "@/lib/ats/interviews";
import { logger } from "@/lib/logger";

const patchSchema = z.object({
  scheduledAt: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time.")
    .optional(),
  duration: z.coerce.number().int().min(15).max(480).optional(),
  meetingUrl: z.string().trim().url().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional(),
  cancel: z.boolean().optional(),
});

/**
 * MIYO-0656: reschedule or cancel. Both reuse the UID and bump SEQUENCE,
 * so the calendar entry people already hold is updated, not duplicated.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const interviewId = Number((await params).interviewId);
    if (!Number.isInteger(interviewId)) return err("Invalid interview ID.", 400);

    try {
      const body = await parseBody(req, patchSchema);

      const interview = await db.query.interviews.findFirst({
        where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
      });
      if (!interview) return err("Interview not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (
        interview.jobPostingId &&
        !(await canOnJob(actor, interview.jobPostingId, "schedule_interviews"))
      ) {
        return err("Forbidden", 403);
      }

      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : interview.scheduledAt;
      const duration = body.duration ?? interview.duration ?? 60;
      const sequence = (interview.icsSequence ?? 0) + 1;

      const [updated] = await db
        .update(interviews)
        .set({
          scheduledAt,
          duration,
          meetingUrl: body.meetingUrl ?? interview.meetingUrl,
          location: body.location ?? interview.location,
          icsSequence: sequence,
          result: body.cancel ? "NO_SHOW" : interview.result,
        })
        .where(eq(interviews.id, interviewId))
        .returning();

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, interview.candidateId),
      });
      const job = interview.jobPostingId
        ? await db.query.jobPostings.findFirst({
            where: eq(jobPostings.id, interview.jobPostingId),
          })
        : null;

      if (candidate) {
        const ids = (interview.panelInterviewerIds as string[] | null) ?? [];
        const interviewers = await interviewerContacts(
          ids.length > 0 ? ids : interview.interviewerId ? [interview.interviewerId] : [],
        );
        try {
          await sendInterviewInvite({
            interviewId,
            orgId: session.orgId,
            candidate,
            jobTitle: job?.title ?? "the role",
            interviewers: interviewers.map((i) => ({ email: i.email, name: i.name })),
            scheduledAt,
            duration,
            sequence,
            type: interview.type ?? "VIDEO",
            locationOrLink: updated.meetingUrl || updated.location || "To be confirmed",
            recruiterName: session.user.name ?? "the hiring team",
            cancel: body.cancel === true,
          });
        } catch (error) {
          logger.error("Interview update email failed", { interviewId, error });
        }
      }

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: interview.candidateId,
        actorId: session.user.id,
        type: body.cancel ? "interview_cancelled" : "interview_rescheduled",
        data: { interviewId, scheduledAt: scheduledAt.toISOString(), sequence },
      });

      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid change.", 400);
      throw e;
    }
  }, req);
}
