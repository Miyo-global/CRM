import { inngest } from "../client";
import { db } from "@/lib/db";
import { interviews, candidates, users, organizations } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { addHours, subHours } from "date-fns";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

function buildCandidateReminderHtml(params: {
  candidateName: string;
  orgName: string;
  interviewType: string;
  scheduledAt: Date;
  meetingLink: string | null;
  location: string | null;
  interviewerName: string | null;
  duration: number;
}): { subject: string; html: string } {
  const dateStr = params.scheduledAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  const locationLine = params.meetingLink
    ? `<p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>`
    : params.location
    ? `<p><strong>Location:</strong> ${params.location}</p>`
    : "";

  return {
    subject: `Interview Reminder: Your interview at ${params.orgName} is tomorrow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f2b7f;">Interview Reminder</h2>
        <p>Dear ${params.candidateName},</p>
        <p>This is a reminder that your interview is scheduled for <strong>tomorrow</strong>.</p>
        <div style="background: #f8f9fa; border-left: 4px solid #bd882c; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p><strong>Date &amp; Time:</strong> ${dateStr}</p>
          <p><strong>Format:</strong> ${params.interviewType}</p>
          <p><strong>Duration:</strong> ${params.duration} minutes</p>
          ${params.interviewerName ? `<p><strong>Interviewer:</strong> ${params.interviewerName}</p>` : ""}
          ${locationLine}
        </div>
        <p>Please be available 5 minutes before your scheduled time. Good luck!</p>
        <p>Best regards,<br/><strong>${params.orgName}</strong></p>
      </div>
    `,
  };
}

function buildInterviewerReminderHtml(params: {
  interviewerName: string;
  orgName: string;
  candidateName: string;
  interviewType: string;
  scheduledAt: Date;
  meetingLink: string | null;
  location: string | null;
  duration: number;
}): { subject: string; html: string } {
  const dateStr = params.scheduledAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  const locationLine = params.meetingLink
    ? `<p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>`
    : params.location
    ? `<p><strong>Location:</strong> ${params.location}</p>`
    : "";

  return {
    subject: `Interview Reminder: ${params.candidateName} — tomorrow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f2b7f;">Interview Reminder</h2>
        <p>Dear ${params.interviewerName},</p>
        <p>You have an interview scheduled for <strong>tomorrow</strong>.</p>
        <div style="background: #f8f9fa; border-left: 4px solid #bd882c; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p><strong>Candidate:</strong> ${params.candidateName}</p>
          <p><strong>Date &amp; Time:</strong> ${dateStr}</p>
          <p><strong>Format:</strong> ${params.interviewType}</p>
          <p><strong>Duration:</strong> ${params.duration} minutes</p>
          ${locationLine}
        </div>
        <p>Best regards,<br/><strong>${params.orgName}</strong></p>
      </div>
    `,
  };
}

function buildPrepEmailHtml(params: {
  candidateName: string;
  orgName: string;
  interviewType: string;
  scheduledAt: Date;
  meetingLink: string | null;
  location: string | null;
  interviewerName: string | null;
  duration: number;
}): { subject: string; html: string } {
  const timeStr = params.scheduledAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    timeStyle: "short",
  });

  const locationLine = params.meetingLink
    ? `<p><strong>Meeting Link:</strong> <a href="${params.meetingLink}">${params.meetingLink}</a></p>`
    : params.location
    ? `<p><strong>Location:</strong> ${params.location}</p>`
    : "";

  const tips: Record<string, string[]> = {
    TECHNICAL: [
      "Review core concepts related to the role",
      "Be ready to walk through your past projects",
      "Think out loud while problem-solving",
    ],
    VIDEO: [
      "Test your camera and microphone beforehand",
      "Find a quiet, well-lit space",
      "Have a glass of water nearby",
    ],
    ONSITE: [
      "Arrive 10 minutes early",
      "Bring a copy of your resume",
      "Review the company's recent news",
    ],
  };
  const tipList = tips[params.interviewType] ?? tips.VIDEO;

  return {
    subject: `Your interview at ${params.orgName} starts in 2 hours — Here's what to expect`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f2b7f;">Almost time! Your interview is in 2 hours</h2>
        <p>Dear ${params.candidateName},</p>
        <p>Your interview with <strong>${params.orgName}</strong> is starting soon at <strong>${timeStr}</strong>.</p>
        <div style="background: #f8f9fa; border-left: 4px solid #bd882c; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p><strong>Format:</strong> ${params.interviewType}</p>
          <p><strong>Duration:</strong> ${params.duration} minutes</p>
          ${params.interviewerName ? `<p><strong>Interviewer:</strong> ${params.interviewerName}</p>` : ""}
          ${locationLine}
        </div>
        <h3 style="color: #0f2b7f;">Quick tips to prepare:</h3>
        <ul>${tipList.map((t) => `<li>${t}</li>`).join("")}</ul>
        <p>You've got this! Good luck.</p>
        <p>Best regards,<br/><strong>${params.orgName}</strong></p>
      </div>
    `,
  };
}

export const interviewReminders = inngest.createFunction(
  { id: "interview-reminders", name: "Send Interview Reminders (24h + 2h)", triggers: { cron: "0 * * * *" } },
  async ({ step }) => {
    const results = await step.run("send-24h-reminders", async () => {
      const now = new Date();
      const windowStart = addHours(now, 23);
      const windowEnd = addHours(now, 25);

      const upcomingInterviews = await db.query.interviews.findMany({
        where: and(
          gte(interviews.scheduledAt, windowStart),
          lte(interviews.scheduledAt, windowEnd),
          eq(interviews.result, "PENDING"),
        ),
        limit: 100,
      });

      const needsReminder = upcomingInterviews.filter(
        (iv) => !((iv.remindersSent ?? {}) as Record<string, boolean>)["24h"]
      );

      if (needsReminder.length === 0) return { sent: 0, skipped: upcomingInterviews.length, total: upcomingInterviews.length };

      const candidateIds = [...new Set(needsReminder.map((iv) => iv.candidateId))];
      const interviewerIds = [...new Set(needsReminder.map((iv) => iv.interviewerId).filter(Boolean) as string[])];
      const orgIds = [...new Set(needsReminder.map((iv) => iv.orgId))];

      const [candidateRows, interviewerRows, orgRows] = await Promise.all([
        db.query.candidates.findMany({ where: inArray(candidates.id, candidateIds), columns: { id: true, firstName: true, lastName: true, email: true } }),
        interviewerIds.length > 0 ? db.query.users.findMany({ where: inArray(users.id, interviewerIds), columns: { id: true, name: true, email: true } }) : Promise.resolve([]),
        db.query.organizations.findMany({ where: inArray(organizations.id, orgIds), columns: { id: true, name: true } }),
      ]);

      const candidateMap = new Map(candidateRows.map((c) => [c.id, c]));
      const interviewerMap = new Map(interviewerRows.map((u) => [u.id, u]));
      const orgMap = new Map(orgRows.map((o) => [o.id, o]));

      let sent = 0;

      for (const interview of needsReminder) {
        const remindersSent = (interview.remindersSent ?? {}) as Record<string, boolean>;
        const candidate = candidateMap.get(interview.candidateId);
        const interviewer = interview.interviewerId ? interviewerMap.get(interview.interviewerId) : null;
        const org = orgMap.get(interview.orgId);
        const orgName = org?.name ?? "Miyo Global";
        const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : "Candidate";

        const emailPromises: Promise<unknown>[] = [];

        if (candidate?.email) {
          const { subject, html } = buildCandidateReminderHtml({
            candidateName,
            orgName,
            interviewType: interview.type ?? "VIDEO",
            scheduledAt: interview.scheduledAt,
            meetingLink: interview.meetingLink ?? null,
            location: interview.location ?? null,
            interviewerName: interviewer?.name ?? null,
            duration: interview.duration ?? 60,
          });
          emailPromises.push(
            sendEmail({ to: candidate.email, subject, html }).catch((e) =>
              logger.error("Failed to send candidate reminder", { interviewId: interview.id, error: e })
            )
          );
        }

        if (interviewer?.email) {
          const { subject, html } = buildInterviewerReminderHtml({
            interviewerName: interviewer.name ?? "Interviewer",
            orgName,
            candidateName,
            interviewType: interview.type ?? "VIDEO",
            scheduledAt: interview.scheduledAt,
            meetingLink: interview.meetingLink ?? null,
            location: interview.location ?? null,
            duration: interview.duration ?? 60,
          });
          emailPromises.push(
            sendEmail({ to: interviewer.email, subject, html }).catch((e) =>
              logger.error("Failed to send interviewer reminder", { interviewId: interview.id, error: e })
            )
          );
        }

        await Promise.allSettled(emailPromises);

        await db
          .update(interviews)
          .set({ remindersSent: { ...remindersSent, "24h": true }, updatedAt: new Date() })
          .where(eq(interviews.id, interview.id));

        sent++;
      }

      return { sent, skipped: upcomingInterviews.length - needsReminder.length, total: upcomingInterviews.length };
    });

    const prepResults = await step.run("send-2h-prep-emails", async () => {
      const now = new Date();
      const windowStart = addHours(now, 1);
      const windowEnd = addHours(now, 3);

      const upcomingInterviews = await db.query.interviews.findMany({
        where: and(
          gte(interviews.scheduledAt, windowStart),
          lte(interviews.scheduledAt, windowEnd),
          eq(interviews.result, "PENDING"),
        ),
        limit: 100,
      });

      const needsPrep = upcomingInterviews.filter(
        (iv) => !((iv.remindersSent ?? {}) as Record<string, boolean>)["2h"]
      );

      if (needsPrep.length === 0) return { sent: 0, skipped: upcomingInterviews.length, total: upcomingInterviews.length };

      const candidateIds = [...new Set(needsPrep.map((iv) => iv.candidateId))];
      const interviewerIds = [...new Set(needsPrep.map((iv) => iv.interviewerId).filter(Boolean) as string[])];
      const orgIds = [...new Set(needsPrep.map((iv) => iv.orgId))];

      const [candidateRows, interviewerRows, orgRows] = await Promise.all([
        db.query.candidates.findMany({ where: inArray(candidates.id, candidateIds), columns: { id: true, firstName: true, lastName: true, email: true } }),
        interviewerIds.length > 0 ? db.query.users.findMany({ where: inArray(users.id, interviewerIds), columns: { id: true, name: true } }) : Promise.resolve([]),
        db.query.organizations.findMany({ where: inArray(organizations.id, orgIds), columns: { id: true, name: true } }),
      ]);

      const candidateMap = new Map(candidateRows.map((c) => [c.id, c]));
      const interviewerMap = new Map(interviewerRows.map((u) => [u.id, u]));
      const orgMap = new Map(orgRows.map((o) => [o.id, o]));

      let sent = 0;

      for (const interview of needsPrep) {
        const remindersSent = (interview.remindersSent ?? {}) as Record<string, boolean>;
        const candidate = candidateMap.get(interview.candidateId);
        const interviewer = interview.interviewerId ? interviewerMap.get(interview.interviewerId) : null;
        const org = orgMap.get(interview.orgId);

        if (candidate?.email) {
          const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
          const { subject, html } = buildPrepEmailHtml({
            candidateName,
            orgName: org?.name ?? "Miyo Global",
            interviewType: interview.type ?? "VIDEO",
            scheduledAt: interview.scheduledAt,
            meetingLink: interview.meetingLink ?? null,
            location: interview.location ?? null,
            interviewerName: interviewer?.name ?? null,
            duration: interview.duration ?? 60,
          });
          await sendEmail({ to: candidate.email, subject, html }).catch((e) =>
            logger.error("Failed to send 2h prep email", { interviewId: interview.id, error: e })
          );
        }

        await db
          .update(interviews)
          .set({ remindersSent: { ...remindersSent, "2h": true }, updatedAt: new Date() })
          .where(eq(interviews.id, interview.id));

        sent++;
      }

      return { sent, skipped: upcomingInterviews.length - needsPrep.length, total: upcomingInterviews.length };
    });

    return { reminders: results, prepEmails: prepResults };
  }
);
