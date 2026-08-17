import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, candidates, calendarEvents, users, jobPostings, organizationMembers } from "@/lib/db/schema";
import { COMPANY_LEGAL_NAME } from "@/lib/constants/company";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { createNotification } from "@/server/actions/create-notification";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppWithSmsFallback } from "@/lib/twilio";
import { getInterviewInviteEmail } from "@/lib/email-templates/hr";
import { format as formatDate } from "date-fns";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

const scheduleSchema = z
  .object({
    candidateId: z.number().int().positive(),
    jobPostingId: z.number().int().positive().optional(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().int().positive().max(480, "Duration cannot exceed 8 hours (480 minutes)").default(60),
    format: z.enum(["VIDEO", "PHONE", "IN_PERSON"]).default("VIDEO"),
    interviewers: z.array(z.string()).min(1),
    meetingLink: z.string().url("Must be a valid URL").max(500).optional().or(z.literal("")),
    location: z.string().trim().max(300).optional(),
    notes: z.string().max(2000).optional(),
    createMeet: z.boolean().default(false),
    notifyChannels: z
      .object({
        email: z.boolean().default(true),
        whatsapp: z.boolean().default(false),
      })
      .default({ email: true, whatsapp: false }),
  })
  .superRefine((d, ctx) => {
    if (d.format === "VIDEO" && !d.meetingLink?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting link is required for online interviews",
        path: ["meetingLink"],
      });
    }
    if (d.format === "IN_PERSON" && !d.location?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required for onsite interviews",
        path: ["location"],
      });
    }
  });

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const body = await parseBody(req, scheduleSchema);

    const candidate = await db.query.candidates.findFirst({
      where: and(
        eq(candidates.id, body.candidateId),
        eq(candidates.orgId, session.orgId)
      ),
    });

    if (!candidate) {
      return err("Candidate not found", 404);
    }

    const uniqueInterviewerIds = Array.from(new Set(body.interviewers));
    const validMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          inArray(organizationMembers.userId, uniqueInterviewerIds)
        )
      );
    const validInterviewerIds = new Set(validMembers.map((m) => m.userId));
    const unknownInterviewers = uniqueInterviewerIds.filter(
      (id) => !validInterviewerIds.has(id)
    );
    if (unknownInterviewers.length > 0) {
      return err("One or more interviewers are not members of this organization", 400);
    }

    const scheduledDate = new Date(body.scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + body.durationMinutes * 60 * 1000);

    if (scheduledDate <= new Date()) {
      return err("Interview must be scheduled in the future.", 400);
    }

    const conflict = await db.query.interviews.findFirst({
      where: and(
        eq(interviews.orgId, session.orgId),
        eq(interviews.candidateId, body.candidateId),
        eq(interviews.scheduledAt, scheduledDate),
      ),
      columns: { id: true },
    });
    if (conflict) {
      return err("An interview for this candidate is already scheduled at this time.", 409);
    }

    const typeMap: Record<string, "VIDEO" | "PHONE" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL"> = {
      VIDEO: "VIDEO",
      PHONE: "PHONE",
      IN_PERSON: "ONSITE",
    };

    const primaryInterviewerId = body.interviewers[0];

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    const interview = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(interviews)
        .values({
          orgId: session.orgId,
          candidateId: body.candidateId,
          jobPostingId: body.jobPostingId,
          interviewerId: primaryInterviewerId,
          panelInterviewerIds: body.interviewers.length > 1 ? body.interviewers : [],
          type: typeMap[body.format] ?? "VIDEO",
          scheduledAt: scheduledDate,
          duration: body.durationMinutes,
          meetingLink: body.meetingLink?.trim() || null,
          location: body.location?.trim() || null,
          notes: body.notes,
          result: "PENDING",
          remindersSent: {},
        })
        .returning();

      await tx.insert(calendarEvents).values({
        orgId: session.orgId,
        title: `Interview: ${candidateName}`,
        description: [
          body.notes ?? `${body.format} interview with ${candidateName}`,
          body.meetingLink ? `Meeting link: ${body.meetingLink}` : null,
          body.location ? `Location: ${body.location}` : null,
        ].filter(Boolean).join("\n"),
        startDate: scheduledDate,
        endDate,
        allDay: false,
        category: "interview",
        entityType: "interview",
        entityId: String(created.id),
        createdBy: session.user.id,
        attendeeIds: body.interviewers,
      });

      return created;
    });

    const notifPromises = body.interviewers.map((userId) =>
      createNotification({
        orgId: session.orgId,
        userId,
        type: "INFO",
        title: "New Interview Scheduled",
        message: `You have been assigned to interview ${candidateName} on ${scheduledDate.toLocaleString(DEFAULT_LOCALE, { timeZone: DEFAULT_TIMEZONE })}.`,
        link: `/hr/recruitment/interviews/${interview.id}`,
        metadata: { interviewId: interview.id, candidateId: body.candidateId },
      })
    );

    await Promise.all(notifPromises);

    const dateLabel = formatDate(scheduledDate, "PPp");
    const formatLabel =
      body.format === "VIDEO" ? "Video Call" : body.format === "PHONE" ? "Phone Call" : "In-Person";

    void (async () => {
      try {
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { googleRefreshToken: true },
        });
        if (currentUser?.googleRefreshToken) {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID ?? "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
              refresh_token: currentUser.googleRefreshToken,
              grant_type: "refresh_token",
            }),
          });
          if (tokenRes.ok) {
            const { access_token } = await tokenRes.json() as { access_token: string };
            await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
              method: "POST",
              headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: `Interview: ${candidateName} - ${body.format}`,
                description: body.notes ?? `${body.format} interview with ${candidateName}`,
                start: { dateTime: scheduledDate.toISOString() },
                end: { dateTime: endDate.toISOString() },
                ...(interview.meetingLink && {
                  conferenceData: { entryPoints: [{ entryPointType: "video", uri: interview.meetingLink }] },
                }),
              }),
            });
          }
        }
      } catch (error) {
        logger.error("Failed to sync interview to Google Calendar", { interviewId: interview.id, error });
      }
    })();

    void (async () => {
      try {
        const interviewerUsers = await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, phone: users.phone })
          .from(users)
          .where(inArray(users.id, body.interviewers));

        const jobPosting = body.jobPostingId
          ? await db.query.jobPostings.findFirst({
              where: and(eq(jobPostings.id, body.jobPostingId), eq(jobPostings.orgId, session.orgId)),
              columns: { title: true },
            })
          : undefined;
        const jobTitle = jobPosting?.title ?? "this position";

        const companyName = COMPANY_LEGAL_NAME;

        const emailTasks: Promise<unknown>[] = [];

        if (body.notifyChannels.email) {
          for (const interviewer of interviewerUsers) {
            if (!interviewer.email) continue;
            const { subject, html } = getInterviewInviteEmail({
              recipientName: `${interviewer.firstName ?? ""} ${interviewer.lastName ?? ""}`.trim() || "Interviewer",
              candidateName,
              jobTitle,
              companyName,
              scheduledAt: dateLabel,
              durationMinutes: body.durationMinutes,
              format: formatLabel,
              meetingLink: body.meetingLink || undefined,
              location: body.location || undefined,
              notes: body.notes,
              recipientRole: "interviewer",
            });
            emailTasks.push(sendEmail({ to: interviewer.email, subject, html }));
          }

          if (candidate.email) {
            const { subject, html } = getInterviewInviteEmail({
              recipientName: candidateName,
              candidateName,
              jobTitle,
              companyName,
              scheduledAt: dateLabel,
              durationMinutes: body.durationMinutes,
              format: formatLabel,
              meetingLink: body.meetingLink || undefined,
              location: body.location || undefined,
              notes: body.notes,
              recipientRole: "candidate",
            });
            emailTasks.push(sendEmail({ to: candidate.email, subject, html }));
          }
        }

        if (body.notifyChannels.whatsapp && candidate.phone) {
          const waBody = `Hi ${candidate.firstName}, your interview at ${companyName} is scheduled for ${dateLabel} (${formatLabel}, ${body.durationMinutes} min). Please be available on time.`;
          emailTasks.push(sendWhatsAppWithSmsFallback(candidate.phone, waBody));
        }

        await Promise.allSettled(emailTasks);
      } catch {
      }
    })();

    return ok(interview, 201);
  });
}
