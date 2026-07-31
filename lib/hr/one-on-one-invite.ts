import { sendEmail } from "@/lib/email/sender";
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
  const when = p.start.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const linkRow = p.meetingLink
    ? `<p style="margin:8px 0"><strong>Join:</strong> <a href="${p.meetingLink}">${p.meetingLink}</a></p>`
    : "";
  const agendaRow = p.agenda
    ? `<p style="margin:8px 0"><strong>Agenda:</strong> ${p.agenda}</p>`
    : "";

  const extraAttendees = (p.additionalAttendees ?? []).filter((a) => a.email);
  const participantsRow =
    extraAttendees.length > 0
      ? `<p style="margin:8px 0"><strong>Participants:</strong> ${[p.organizerName, p.attendeeName, ...extraAttendees.map((a) => a.name || a.email)].join(", ")}</p>`
      : "";

  const ccList = Array.from(
    new Set([p.organizerEmail, ...extraAttendees.map((a) => a.email)].filter(Boolean))
  );

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">
      <p>Hi ${p.attendeeName},</p>
      <p>${p.organizerName} has scheduled a 1-on-1 with you.</p>
      <p style="margin:8px 0"><strong>When:</strong> ${when} · ${p.durationMinutes} min</p>
      ${linkRow}
      ${agendaRow}
      ${participantsRow}
      <p style="margin-top:12px;color:#555">A calendar invite (.ics) is attached — open it to add this to Google Calendar, Outlook, or Apple Calendar.</p>
    </div>`;

  try {
    await sendEmail({
      to: p.attendeeEmail,
      cc: ccList,
      subject: `1-on-1 scheduled with ${p.organizerName}`,
      html,
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
