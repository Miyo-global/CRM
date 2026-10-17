import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import {
  atsEmailLog,
  candidates,
  interviewScorecards,
  interviews,
  jobPostings,
  users,
} from "@/lib/db/schema";
import { sendTemplateEmail } from "@/lib/email/sender";
import { formatIST } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

/**
 * MIYO-0657, MIYO-0659: the mails that hang off an interview's clock.
 * remindersSent on the row is what stops a second send, so the job is safe
 * to run every hour and safe to run twice.
 */
type ReminderKind = "candidate24h" | "interviewer1h" | "feedback" | "feedbackNudge";

function alreadySent(row: { remindersSent: Record<string, boolean> }, kind: ReminderKind) {
  return row.remindersSent?.[kind] === true;
}

/** The candidate's Emails tab should show the reminders too (MIYO-0668). */
async function logCandidateMail(
  orgId: string,
  candidateId: number,
  templateId: string,
  toEmail: string,
) {
  await db
    .insert(atsEmailLog)
    .values({ orgId, candidateId, templateId, toEmail, status: "sent" })
    .catch((error) => logger.error("ATS email log failed", { templateId, error }));
}

async function markSent(interviewId: number, kind: ReminderKind) {
  await db
    .update(interviews)
    .set({ remindersSent: sql`${interviews.remindersSent} || ${JSON.stringify({ [kind]: true })}::jsonb` })
    .where(eq(interviews.id, interviewId));
}

function timeParts(scheduledAt: Date) {
  return {
    interview_date: formatIST(scheduledAt, { day: "numeric", month: "long", year: "numeric" }),
    interview_time: `${formatIST(scheduledAt, { hour: "2-digit", minute: "2-digit" })} IST`,
  };
}

/** Everything due in this run, in one query per window. */
export async function runInterviewReminders(now = new Date()) {
  const rows = await db
    .select({
      id: interviews.id,
      orgId: interviews.orgId,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
      type: interviews.type,
      meetingUrl: interviews.meetingUrl,
      location: interviews.location,
      result: interviews.result,
      remindersSent: interviews.remindersSent,
      interviewerId: interviews.interviewerId,
      candidateId: candidates.id,
      candidateFirstName: candidates.firstName,
      candidateLastName: candidates.lastName,
      candidateEmail: candidates.email,
      jobTitle: jobPostings.title,
      interviewerEmail: users.email,
      interviewerName: users.name,
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .leftJoin(jobPostings, eq(jobPostings.id, interviews.jobPostingId))
    .leftJoin(users, eq(users.id, interviews.interviewerId))
    .where(
      and(
        gte(interviews.scheduledAt, new Date(now.getTime() - 3 * 86_400_000)),
        lte(interviews.scheduledAt, new Date(now.getTime() + 2 * 86_400_000)),
      ),
    );

  let sent = 0;

  for (const row of rows) {
    const start = new Date(row.scheduledAt).getTime();
    const end = start + (row.duration ?? 60) * 60_000;
    const minutesAway = (start - now.getTime()) / 60_000;
    const minutesSinceEnd = (now.getTime() - end) / 60_000;
    const shared = {
      ...timeParts(new Date(row.scheduledAt)),
      job_title: row.jobTitle ?? "the role",
      interview_mode: row.type ?? "VIDEO",
      location_or_link: row.meetingUrl || row.location || "To be confirmed",
      recruiter_name: "the hiring team",
      booking_url: `${appUrl}/careers`,
      privacy_url: `${appUrl}/privacy`,
      withdraw_url: `${appUrl}/careers`,
    };

    try {
      // 24 hours before, to the candidate.
      if (minutesAway <= 24 * 60 && minutesAway > 0 && !alreadySent(row, "candidate24h")) {
        await sendTemplateEmail("ats-interview-reminder", {
          to: row.candidateEmail,
          category: "hr",
          vars: { ...shared, first_name: row.candidateFirstName },
        });
        await logCandidateMail(
          row.orgId,
          row.candidateId,
          "ats-interview-reminder",
          row.candidateEmail,
        );
        await markSent(row.id, "candidate24h");
        sent += 1;
      }

      // One hour before, to the interviewer.
      if (
        row.interviewerEmail &&
        minutesAway <= 60 &&
        minutesAway > 0 &&
        !alreadySent(row, "interviewer1h")
      ) {
        await sendTemplateEmail("ats-interview-reminder", {
          to: row.interviewerEmail,
          category: "hr",
          vars: {
            ...shared,
            first_name: row.interviewerName ?? "there",
            candidate_name: `${row.candidateFirstName} ${row.candidateLastName}`.trim(),
          },
        });
        await markSent(row.id, "interviewer1h");
        sent += 1;
      }

      // MIYO-0659: feedback an hour after it ends, a nudge a day later,
      // both only while no scorecard exists.
      if (row.interviewerEmail && minutesSinceEnd >= 60) {
        const scorecard = await db.query.interviewScorecards.findFirst({
          where: and(
            eq(interviewScorecards.interviewId, row.id),
            eq(interviewScorecards.interviewerId, row.interviewerId as string),
          ),
          columns: { submittedAt: true },
        });

        if (!scorecard?.submittedAt) {
          const kind: ReminderKind | null = !alreadySent(row, "feedback")
            ? "feedback"
            : minutesSinceEnd >= 24 * 60 && !alreadySent(row, "feedbackNudge")
              ? "feedbackNudge"
              : null;

          if (kind) {
            await sendTemplateEmail("ats-interviewer-feedback-request", {
              to: row.interviewerEmail,
              category: "hr",
              vars: {
                ...shared,
                first_name: row.interviewerName ?? "there",
                candidate_name: `${row.candidateFirstName} ${row.candidateLastName}`.trim(),
                scorecard_url: `${appUrl}/ats/interviews/${row.id}`,
              },
            });
            await markSent(row.id, kind);
            sent += 1;
          }
        }
      }
    } catch (error) {
      logger.error("Interview reminder failed", { interviewId: row.id, error });
    }
  }

  return { considered: rows.length, sent };
}
