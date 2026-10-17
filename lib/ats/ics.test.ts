import { describe, it, expect } from "vitest";

import { buildIcs, interviewUid } from "./ics";

const base = {
  uid: interviewUid(42),
  sequence: 0,
  start: new Date("2026-11-03T04:30:00.000Z"),
  duration: 45,
  summary: "Interview: Backend Engineer",
  organiser: { email: "hr@miyoglobal.com", name: "Miyo HR" },
  attendees: [{ email: "asha@example.com", name: "Asha Rao" }],
  method: "REQUEST" as const,
  stamp: new Date("2026-10-17T10:00:00.000Z"),
};

describe("buildIcs", () => {
  it("writes the start and the end from the duration", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART:20261103T043000Z");
    expect(ics).toContain("DTEND:20261103T051500Z");
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("keeps the UID and bumps the sequence on a reschedule", () => {
    const first = buildIcs(base);
    const second = buildIcs({ ...base, sequence: 1, start: new Date("2026-11-04T04:30:00.000Z") });
    expect(first).toContain("UID:interview-42@crm.miyoglobal.com");
    expect(second).toContain("UID:interview-42@crm.miyoglobal.com");
    expect(second).toContain("SEQUENCE:1");
  });

  it("cancels with the same UID", () => {
    const ics = buildIcs({ ...base, sequence: 2, method: "CANCEL" });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:interview-42@crm.miyoglobal.com");
  });

  it("escapes the characters that would break a line", () => {
    const ics = buildIcs({ ...base, location: "Hyderabad, Telangana; 3rd floor" });
    expect(ics).toContain("LOCATION:Hyderabad\\, Telangana\; 3rd floor");
  });

  it("folds a long line and never leaves a bare newline in a value", () => {
    const ics = buildIcs({ ...base, description: "x".repeat(200) });
    for (const line of ics.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});
