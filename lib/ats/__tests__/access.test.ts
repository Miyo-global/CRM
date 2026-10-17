import { describe, it, expect } from "vitest";

import {
  ALL_CAPABILITIES,
  capabilitiesFor,
  isOrgWideAtsRole,
  type AtsCapability,
} from "@/lib/ats/capabilities";

/**
 * MIYO-0682: the permission matrix. Every role against every seat, so a
 * change to the rules has to come with a change here.
 */
const SYSTEM_ROLES = ["CEO", "HR", "ADMIN", "RECRUITER", "ENGINEERING", "SALES", undefined];
const SEATS = [undefined, "HIRING_MANAGER", "INTERVIEWER", "RECRUITER"];

function caps(role: string | undefined, seat: string | undefined): AtsCapability[] {
  return [...capabilitiesFor(role, seat)].sort();
}

describe("ATS capabilities", () => {
  it("gives CEO, HR and ADMIN everything on every job", () => {
    for (const role of ["CEO", "HR", "ADMIN"]) {
      expect(isOrgWideAtsRole(role)).toBe(true);
      expect(caps(role, undefined)).toEqual([...ALL_CAPABILITIES].sort());
    }
  });

  it("gives a recruiter everything without a seat, but not org-wide status", () => {
    expect(isOrgWideAtsRole("RECRUITER")).toBe(false);
    expect(caps("RECRUITER", undefined)).toEqual([...ALL_CAPABILITIES].sort());
  });

  it("gives an ordinary employee nothing without a seat", () => {
    for (const role of ["ENGINEERING", "SALES", undefined]) {
      expect(caps(role, undefined)).toEqual([]);
    }
  });

  it("lets a hiring manager work the pipeline but never the offer", () => {
    const manager = caps("ENGINEERING", "HIRING_MANAGER");
    expect(manager).toContain("manage_candidates");
    expect(manager).toContain("schedule_interviews");
    expect(manager).not.toContain("manage_offers");
    expect(manager).not.toContain("manage_job");
  });

  it("lets an interviewer see and score, nothing else", () => {
    expect(caps("ENGINEERING", "INTERVIEWER")).toEqual(["submit_scorecard", "view"]);
  });

  it("never narrows what a role already has when a seat is added", () => {
    for (const role of SYSTEM_ROLES) {
      for (const seat of SEATS) {
        const withoutSeat = caps(role, undefined);
        const withSeat = caps(role, seat);
        for (const capability of withoutSeat) {
          expect(withSeat).toContain(capability);
        }
      }
    }
  });

  it("keeps the matrix as written", () => {
    const matrix = SYSTEM_ROLES.map((role) => ({
      role: role ?? "none",
      seats: Object.fromEntries(SEATS.map((seat) => [seat ?? "none", caps(role, seat).length])),
    }));

    expect(matrix).toEqual([
      { role: "CEO", seats: { none: 6, HIRING_MANAGER: 6, INTERVIEWER: 6, RECRUITER: 6 } },
      { role: "HR", seats: { none: 6, HIRING_MANAGER: 6, INTERVIEWER: 6, RECRUITER: 6 } },
      { role: "ADMIN", seats: { none: 6, HIRING_MANAGER: 6, INTERVIEWER: 6, RECRUITER: 6 } },
      { role: "RECRUITER", seats: { none: 6, HIRING_MANAGER: 6, INTERVIEWER: 6, RECRUITER: 6 } },
      { role: "ENGINEERING", seats: { none: 0, HIRING_MANAGER: 4, INTERVIEWER: 2, RECRUITER: 6 } },
      { role: "SALES", seats: { none: 0, HIRING_MANAGER: 4, INTERVIEWER: 2, RECRUITER: 6 } },
      { role: "none", seats: { none: 0, HIRING_MANAGER: 4, INTERVIEWER: 2, RECRUITER: 6 } },
    ]);
  });
});
