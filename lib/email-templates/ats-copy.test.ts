import { describe, expect, it } from "vitest";

import { EMAIL_CATALOG, type EmailTemplateId } from "./catalog.generated";
import { renderEmail, templatePlaceholders } from "./render";
import { buildIcs, interviewUid } from "@/lib/ats/ics";

/**
 * MIYO-0687: every ats-* template renders with nothing left to fill in,
 * and the interview invite carries an ICS that a mail client will read.
 */
const ATS_TEMPLATES = Object.keys(EMAIL_CATALOG).filter((id) =>
  id.startsWith("ats-"),
) as EmailTemplateId[];

/** A plausible value for any placeholder, so nothing renders empty. */
function sampleVars(id: EmailTemplateId): Record<string, string> {
  return Object.fromEntries(
    templatePlaceholders(id).map((key) => [
      key,
      key.endsWith("_url") ? `https://example.com/${key}` : `sample ${key.replace(/_/g, " ")}`,
    ]),
  );
}

describe("the ats-* templates", () => {
  it("there are the nine the ATS sends", () => {
    expect(ATS_TEMPLATES.length).toBeGreaterThanOrEqual(9);
  });

  it.each(ATS_TEMPLATES)("%s leaves no placeholder behind", (id) => {
    const { subject, html, text } = renderEmail(id, sampleVars(id));
    for (const part of [subject, html, text]) {
      expect(part).not.toMatch(/\{\{\s*[a-z0-9_]+\s*\}\}/);
    }
  });

  it.each(ATS_TEMPLATES)("%s has a subject, a body and a plain-text part", (id) => {
    const { subject, html, text } = renderEmail(id, sampleVars(id));
    expect(subject.trim().length).toBeGreaterThan(0);
    expect(html).toContain("<body");
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it.each(ATS_TEMPLATES)("%s renders empty rather than printing undefined", (id) => {
    const { subject, html, text } = renderEmail(id, {});
    for (const part of [subject, html, text]) {
      expect(part).not.toContain("undefined");
      expect(part).not.toContain("[object Object]");
    }
  });
});

describe("the interview invite's calendar attachment", () => {
  const ics = buildIcs({
    uid: interviewUid(42),
    sequence: 0,
    start: new Date("2026-11-03T04:30:00.000Z"),
    duration: 45,
    summary: "Interview",
    organiser: { email: "hr@example.com" },
    attendees: [{ email: "asha@example.com" }],
    method: "REQUEST",
    stamp: new Date("2026-10-18T10:00:00.000Z"),
  });

  it("is a calendar a mail client will open", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("ORGANIZER");
    expect(ics).toContain("ATTENDEE");
  });

  it("uses CRLF line endings, as the spec requires", () => {
    expect(ics).toContain("\r\n");
    expect(ics.split("\r\n").join("")).not.toContain("\n");
  });
});
