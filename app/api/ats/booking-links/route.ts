import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import {
  atsEmailLog,
  candidateApplications,
  candidates,
  interviewBookingLinks,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { sendEmail } from "@/lib/email/sender";
import { formatIST } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  interviewerIds: z.array(z.string().min(1)).min(1, "Choose at least one interviewer."),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
  interviewType: z.enum(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"]).default("VIDEO"),
  slots: z
    .array(z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Bad slot"))
    .min(2, "Offer at least two times.")
    .max(20),
  expiresAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick an expiry."),
});

/**
 * MIYO-0660: offer the candidate a few times and let them pick. The link
 * carries a random token and an expiry; booking it creates the interview
 * through the same path as scheduling by hand.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, bodySchema);

      const rows = await db
        .select({
          candidateId: candidateApplications.candidateId,
          jobId: candidateApplications.jobPostingId,
          jobTitle: jobPostings.title,
          firstName: candidates.firstName,
          email: candidates.email,
        })
        .from(candidateApplications)
        .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
        .innerJoin(candidates, eq(candidates.id, candidateApplications.candidateId))
        .where(
          and(
            eq(candidateApplications.id, body.applicationId),
            eq(candidateApplications.orgId, session.orgId),
          ),
        )
        .limit(1);

      const found = rows[0];
      if (!found) return err("Application not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (!(await canOnJob(actor, found.jobId, "schedule_interviews"))) {
        return err("Forbidden", 403);
      }

      const token = randomBytes(24).toString("base64url");
      const [link] = await db
        .insert(interviewBookingLinks)
        .values({
          orgId: session.orgId,
          candidateId: found.candidateId,
          jobPostingId: found.jobId,
          token,
          interviewerIds: body.interviewerIds,
          durationMinutes: body.durationMinutes,
          interviewType: body.interviewType,
          availableSlots: body.slots.map((start) => ({
            start: new Date(start).toISOString(),
            end: new Date(new Date(start).getTime() + body.durationMinutes * 60_000).toISOString(),
          })),
          expiresAt: new Date(body.expiresAt),
          createdBy: session.user.id,
        })
        .returning();

      const url = `${appUrl}/interview/${token}`;
      try {
        await sendEmail({
          to: found.email,
          subject: `Pick a time for your ${found.jobTitle} interview`,
          html: `<p>Hello ${found.firstName},</p><p>Choose a time that suits you:</p><p><a href="${url}">${url}</a></p><p>The link works until ${formatIST(new Date(body.expiresAt))} IST.</p>`,
          text: `Hello ${found.firstName},\n\nChoose a time that suits you: ${url}\n\nThe link works until ${formatIST(new Date(body.expiresAt))} IST.`,
          category: "hr",
        });
        await db.insert(atsEmailLog).values({
          orgId: session.orgId,
          candidateId: found.candidateId,
          templateId: "ats-interview-self-schedule",
          toEmail: found.email,
          status: "sent",
        });
      } catch (error) {
        logger.error("Booking link email failed", { linkId: link.id, error });
      }

      return ok({ id: link.id, url }, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid link.", 400);
      throw e;
    }
  }, req);
}
