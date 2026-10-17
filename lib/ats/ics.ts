/**
 * MIYO-0656: the calendar invite. Pure text building, so it can be tested
 * without a mail provider. A reschedule reuses the UID and bumps SEQUENCE;
 * a cancellation sends METHOD:CANCEL with the same UID, which is what makes
 * Gmail and Outlook update the event already in the calendar rather than
 * adding a second one.
 */

export interface IcsAttendee {
  email: string;
  name?: string | null;
}

export interface IcsEvent {
  uid: string;
  sequence: number;
  start: Date;
  /** Minutes. */
  duration: number;
  summary: string;
  description?: string | null;
  location?: string | null;
  organiser: IcsAttendee;
  attendees: IcsAttendee[];
  method: "REQUEST" | "CANCEL";
  /** Defaults to now; a fixed value keeps tests stable. */
  stamp?: Date;
}

function icsTime(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** RFC 5545: escape the separators, and never emit a raw newline in a value. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with a leading space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

export function buildIcs(event: IcsEvent): string {
  const end = new Date(event.start.getTime() + event.duration * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Miyo Global//CRM//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${icsTime(event.stamp ?? new Date())}`,
    `DTSTART:${icsTime(event.start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    `ORGANIZER;CN=${escapeText(event.organiser.name ?? event.organiser.email)}:mailto:${event.organiser.email}`,
    ...event.attendees.map(
      (attendee) =>
        `ATTENDEE;CN=${escapeText(attendee.name ?? attendee.email)};RSVP=TRUE:mailto:${attendee.email}`,
    ),
    `STATUS:${event.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** A UID that stays with the interview for its whole life. */
export function interviewUid(interviewId: number, host = "crm.miyoglobal.com"): string {
  return `interview-${interviewId}@${host}`;
}
