import { sendTemplateEmail } from "@/lib/email/sender";
import { formatIST, formatISTTime } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

export interface AdditionalAttendee {
  name: string;
  email: string;
}

export interface OneOnOneInviteParams {
  meetingId: number;
  start: Date;
  durationMinutes: number;
  agenda?: string | null;
  meetingLink?: string | null;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  additionalAttendees?: AdditionalAttendee[];
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildOneOnOneIcs(p: OneOnOneInviteParams): string {
  const end = new Date(p.start.getTime() + p.durationMinutes * 60_000);
  const descParts: string[] = [];
  if (p.agenda) descParts.push(p.agenda);
  if (p.meetingLink) descParts.push(`Join: ${p.meetingLink}`);
  const description = descParts.join("\n\n") || "1-on-1 meeting";
  const location = p.meetingLink || "1-on-1";

  const extraAttendeeLines = (p.additionalAttendees ?? [])
    .filter((a) => a.email)
    .map(
      (a) =>
        `ATTENDEE;CN=${icsEscape(a.name || a.email)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${a.email}`
    );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Miyo Global CRM//1-on-1//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:one-on-one-${p.meetingId}@miyoglobal`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(p.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${icsEscape(`1-on-1: ${p.organizerName} & ${p.attendeeName}`)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    `ORGANIZER;CN=${icsEscape(p.organizerName)}:mailto:${p.organizerEmail}`,
    `ATTENDEE;CN=${icsEscape(p.attendeeName)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${p.attendeeEmail}`,
    ...extraAttendeeLines,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendOneOnOneInvite(p: OneOnOneInviteParams): Promise<void> {
  const ics = buildOneOnOneIcs(p);

  const extraAttendees = (p.additionalAttendees ?? []).filter((a) => a.email);
  const ccList = Array.from(
    new Set([p.organizerEmail, ...extraAttendees.map((a) => a.email)].filter(Boolean))
  );

  try {
    // MIYO-0154: the one-on-one-invite template, rather than hand-built HTML.
    await sendTemplateEmail("one-on-one-invite", {
      to: p.attendeeEmail,
      cc: ccList,
      vars: {
        organizer_name: p.organizerName,
        meeting_date: formatIST(p.start, { hour: undefined, minute: undefined }),
        meeting_time: `${formatISTTime(p.start)} (${p.durationMinutes} min)`,
        location: p.meetingLink ? "Online" : "1-on-1",
        meeting_url: p.meetingLink ?? "",
        agenda: p.agenda ?? "None given",
      },
      attachments: [
        {
          filename: "invite.ics",
          content: Buffer.from(ics, "utf8"),
          type: "text/calendar; method=REQUEST",
        },
      ],
    });
  } catch (e) {
    logger.error("Failed to send 1-on-1 calendar invite", e);
  }
}
