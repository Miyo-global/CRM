import type { NextRequest } from "next/server";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  candidateApplications,
  candidates,
  interviews,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { atsPageAccess } from "@/lib/ats/page-access";
import {
  interviewerConflicts,
  interviewerContacts,
  sendInterviewInvite,
} from "@/lib/ats/interviews";
import { interviewUid } from "@/lib/ats/ics";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  type: z.enum(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"]).default("VIDEO"),
  /** ISO datetime; the form sends IST and the browser converts. */
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time."),
  duration: z.coerce.number().int().min(15).max(480).default(60),
  interviewerIds: z.array(z.string().min(1)).min(1, "Choose at least one interviewer."),
  meetingUrl: z.string().trim().url().optional().or(z.literal("")),
  location: z.string().trim().max(200).optional(),
  /** Set to schedule over a clash the caller has seen. */
  force: z.boolean().default(false),
});

/** MIYO-0656: the interviews this person may see. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    const { allowed, jobIds } = await atsPageAccess({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
    });
    if (!allowed) return err("Not found.", 404);

    const rows = await db
      .select({
        id: interviews.id,
        candidateId: interviews.candidateId,
        candidateName: candidates.firstName,
        jobTitle: jobPostings.title,
        type: interviews.type,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        result: interviews.result,
      })
      .from(interviews)
      .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
      .leftJoin(jobPostings, eq(jobPostings.id, interviews.jobPostingId))
      .where(
        and(
          eq(interviews.orgId, session.orgId),
          jobIds ? inArray(interviews.jobPostingId, jobIds) : undefined,
          gte(interviews.scheduledAt, new Date(Date.now() - 7 * 86_400_000)),
        ),
      )
      .orderBy(asc(interviews.scheduledAt));

    return ok(rows);
  }, req);
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, createSchema);

      const application = await db
        .select({
          id: candidateApplications.id,
          candidateId: candidateApplications.candidateId,
          jobId: candidateApplications.jobPostingId,
          jobTitle: jobPostings.title,
        })
        .from(candidateApplications)
        .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
        .where(
          and(
            eq(candidateApplications.id, body.applicationId),
            eq(candidateApplications.orgId, session.orgId),
          ),
        )
        .limit(1);

      const found = application[0];
      if (!found) return err("Application not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (!(await canOnJob(actor, found.jobId, "schedule_interviews"))) {
        return err("Forbidden", 403);
      }

      const scheduledAt = new Date(body.scheduledAt);
      if (!body.force) {
        for (const interviewerId of body.interviewerIds) {
          const clashes = await interviewerConflicts(interviewerId, scheduledAt, body.duration);
          if (clashes.length > 0) {
            return err("An interviewer is already booked then. Send again to override.", 409);
          }
        }
      }

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, found.candidateId),
      });
      if (!candidate) return err("Candidate not found.", 404);

      const [created] = await db
        .insert(interviews)
        .values({
          orgId: session.orgId,
          candidateId: found.candidateId,
          jobPostingId: found.jobId,
          interviewerId: body.interviewerIds[0],
          panelInterviewerIds: body.interviewerIds,
          type: body.type,
          scheduledAt,
          duration: body.duration,
          meetingUrl: body.meetingUrl || null,
          location: body.location || null,
          icsSequence: 0,
        })
        .returning();

      await db
        .update(interviews)
        .set({ icsUid: interviewUid(created.id) })
        .where(eq(interviews.id, created.id));

      const interviewers = await interviewerContacts(body.interviewerIds);

      try {
        await sendInterviewInvite({
          interviewId: created.id,
          orgId: session.orgId,
          candidate,
          jobTitle: found.jobTitle,
          interviewers: interviewers.map((i) => ({ email: i.email, name: i.name })),
          scheduledAt,
          duration: body.duration,
          sequence: 0,
          type: body.type,
          locationOrLink: body.meetingUrl || body.location || "To be confirmed",
          recruiterName: session.user.name ?? "the hiring team",
        });
      } catch (error) {
        logger.error("Interview invite failed", { interviewId: created.id, error });
      }

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: found.candidateId,
        applicationId: found.id,
        actorId: session.user.id,
        type: "interview_scheduled",
        data: { interviewId: created.id, scheduledAt: scheduledAt.toISOString() },
      });

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid interview.", 400);
      throw e;
    }
  }, req);
}
