import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviews, candidates, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addMinutes, formatISO } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { NOREPLY_EMAIL } from "@/lib/constants/company";

type Params = { params: Promise<{ interviewId: string }> };

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, MAX));
  let i = MAX;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return chunks.join("\r\n");
}

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  return withAuth(async (session) => {
    const { interviewId: id } = await params;
    const interviewId = Number(id);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const [candidate, interviewer, org] = await Promise.all([
      db.query.candidates.findFirst({
        where: eq(candidates.id, interview.candidateId),
        columns: { firstName: true, lastName: true, email: true },
      }),
      interview.interviewerId
        ? db.query.users.findFirst({
            where: eq(users.id, interview.interviewerId),
            columns: { name: true, email: true },
          })
        : Promise.resolve(null),
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { name: true },
      }),
    ]);

    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`.trim()
      : "Candidate";

    const dtStart = formatIcsDate(interview.scheduledAt);
    const dtEnd = formatIcsDate(addMinutes(interview.scheduledAt, interview.duration ?? 60));
    const dtstamp = formatIcsDate(new Date());
    const uid = `interview-${interviewId}-${session.orgId}@miyoglobal.com`;
    const orgName = org?.name ?? "Miyo Global";

    const summary = escapeIcsText(
      `Interview: ${candidateName} — ${interview.type ?? "VIDEO"}`
    );

    const descriptionParts: string[] = [
      `Candidate: ${candidateName}`,
      `Format: ${interview.type ?? "VIDEO"}`,
      `Duration: ${interview.duration ?? 60} minutes`,
    ];
    if (interview.meetingLink) {
      descriptionParts.push(`Meeting Link: ${interview.meetingLink}`);
    }
    if (interview.notes) {
      descriptionParts.push(`Notes: ${interview.notes}`);
    }
    const description = escapeIcsText(descriptionParts.join("\n"));

    const location = escapeIcsText(
      interview.location ?? interview.meetingLink ?? `${orgName} Office`
    );

    const attendeeLines: string[] = [];
    if (candidate?.email) {
      attendeeLines.push(
        `ATTENDEE;CN=${escapeIcsText(candidateName)};ROLE=REQ-PARTICIPANT:mailto:${candidate.email}`
      );
    }
    if (interviewer?.email) {
      attendeeLines.push(
        `ATTENDEE;CN=${escapeIcsText(interviewer.name ?? "Interviewer")};ROLE=REQ-PARTICIPANT:mailto:${interviewer.email}`
      );
    }

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${orgName}//Miyo Global CRM//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `ORGANIZER;CN=${escapeIcsText(orgName)}:mailto:${NOREPLY_EMAIL}`,
      ...attendeeLines,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const ics = lines.map(foldLine).join("\r\n") + "\r\n";

    const fileName = `interview-${candidateName.replace(/\s+/g, "-")}-${formatISO(interview.scheduledAt, { representation: "date" })}.ics`;

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
