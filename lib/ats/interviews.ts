import "server-only";

import { and, eq, gt, lt, ne, or } from "drizzle-orm";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { atsEmailLog, interviews, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/sender";
import { renderEmail } from "@/lib/email-templates/render";
import { formatIST } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { buildIcs, interviewUid, type IcsAttendee } from "./ics";

export interface InterviewInviteParams {
  interviewId: number;
  orgId: string;
  candidate: { id: number; firstName: string; lastName: string; email: string };
  jobTitle: string;
  interviewers: { email: string; name: string | null }[];
  scheduledAt: Date;
  duration: number;
  sequence: number;
  type: string;
  locationOrLink: string;
  recruiterName: string;
  cancel?: boolean;
}

/**
 * MIYO-0656: an interviewer double-booked is the usual scheduling bug, so
 * the overlap is checked before the row is written.
 */
export async function interviewerConflicts(
  interviewerId: string,
  start: Date,
  duration: number,
  excludeInterviewId?: number,
) {
  const end = new Date(start.getTime() + duration * 60_000);
  const rows = await db
    .select({
      id: interviews.id,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
    })
    .from(interviews)
    .where(
      and(
        eq(interviews.interviewerId, interviewerId),
        excludeInterviewId ? ne(interviews.id, excludeInterviewId) : undefined,
        // A day either side, then the exact overlap is worked out here,
        // because the other row's end depends on its own duration.
        gt(interviews.scheduledAt, new Date(start.getTime() - 24 * 60 * 60_000)),
        lt(interviews.scheduledAt, new Date(end.getTime() + 24 * 60 * 60_000)),
      ),
    );

  return rows.filter((row) => {
    const rowStart = new Date(row.scheduledAt).getTime();
    const rowEnd = rowStart + (row.duration ?? 60) * 60_000;
    return rowStart < end.getTime() && rowEnd > start.getTime();
  });
}

/**
 * The invite. The candidate gets the ats-interview-invite template; the
 * interviewers get the same calendar entry with a plainer note. Both carry
 * the ICS, so a reschedule updates the event already in their calendar.
 */
export async function sendInterviewInvite(params: InterviewInviteParams) {
  const {
    interviewId,
    candidate,
    jobTitle,
    interviewers,
    scheduledAt,
    duration,
    sequence,
    locationOrLink,
  } = params;

  const attendees: IcsAttendee[] = [
    { email: candidate.email, name: `${candidate.firstName} ${candidate.lastName}`.trim() },
    ...interviewers.map((i) => ({ email: i.email, name: i.name })),
  ];

  const ics = buildIcs({
    uid: interviewUid(interviewId),
    sequence,
    start: scheduledAt,
    duration,
    summary: `${jobTitle} interview — ${candidate.firstName} ${candidate.lastName}`.trim(),
    description: `${params.type} interview for ${jobTitle}.`,
    location: locationOrLink,
    organiser: { email: process.env.EMAIL_FROM_ADDRESS ?? "hr@miyoglobal.com", name: "Miyo Global" },
    attendees,
    method: params.cancel ? "CANCEL" : "REQUEST",
  });

  const attachment = {
    filename: "invite.ics",
    content: ics,
    // METHOD in the content type is what makes Gmail show the invite card.
    type: `text/calendar; charset=utf-8; method=${params.cancel ? "CANCEL" : "REQUEST"}`,
  };

  const date = `${formatIST(scheduledAt, { day: "numeric", month: "long", year: "numeric" })}`;
  const time = `${formatIST(scheduledAt, { hour: "2-digit", minute: "2-digit" })} IST`;

  const vars = {
    first_name: candidate.firstName,
    job_title: jobTitle,
    round_name: params.type,
    interview_date: date,
    interview_time: time,
    duration: `${duration} minutes`,
    interview_mode: params.type,
    location_or_link: locationOrLink,
    interviewer_names: interviewers.map((i) => i.name ?? i.email).join(", ") || "the hiring team",
    recruiter_name: params.recruiterName,
    booking_url: `${appUrl}/careers`,
    privacy_url: `${appUrl}/privacy`,
    withdraw_url: `${appUrl}/careers`,
  };

  if (params.cancel) {
    const subject = `Cancelled: ${jobTitle} interview on ${date}`;
    await sendEmail({
      to: [candidate.email, ...interviewers.map((i) => i.email)],
      subject,
      html: `<p>The ${jobTitle} interview on ${date} at ${time} is cancelled. We will write again if it is rearranged.</p>`,
      text: `The ${jobTitle} interview on ${date} at ${time} is cancelled.`,
      attachments: [attachment],
    });
  } else {
    const rendered = renderEmail("ats-interview-invite", vars);
    await sendEmail({
      to: candidate.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: [attachment],
      category: "hr",
    });

    if (interviewers.length > 0) {
      await sendEmail({
        to: interviewers.map((i) => i.email),
        subject: `Interview: ${candidate.firstName} ${candidate.lastName} for ${jobTitle}`,
        html: `<p>${date} at ${time}, ${duration} minutes.</p><p>${locationOrLink}</p><p><a href="${appUrl}/ats/candidates/${candidate.id}">Open the candidate</a></p>`,
        text: `${date} at ${time}, ${duration} minutes.\n${locationOrLink}\n${appUrl}/ats/candidates/${candidate.id}`,
        attachments: [attachment],
        category: "hr",
      });
    }
  }

  await db
    .insert(atsEmailLog)
    .values({
      orgId: params.orgId,
      candidateId: candidate.id,
      templateId: params.cancel ? "ats-interview-cancelled" : "ats-interview-invite",
      toEmail: candidate.email,
      status: "sent",
    })
    .catch((error) => logger.error("ATS email log failed", { interviewId, error }));
}

/** Names and addresses for a set of user ids. */
export async function interviewerContacts(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(or(...ids.map((id) => eq(users.id, id))));
  return rows;
}
