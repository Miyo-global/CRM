import { describe, expect, it } from "vitest";
import { capabilitiesFor } from "./capabilities";

describe("ATS capabilities (MIYO-0629)", () => {
  it("gives HR and the CEO every capability on any job", () => {
    for (const role of ["CEO", "HR", "ADMIN"]) {
      const caps = capabilitiesFor(role, null);
      expect(caps.has("manage_job")).toBe(true);
      expect(caps.has("manage_offers")).toBe(true);
    }
  });

  it("gives a recruiter the same, without a seat on the job", () => {
    const caps = capabilitiesFor("RECRUITER", null);
    expect(caps.has("manage_candidates")).toBe(true);
    expect(caps.has("manage_offers")).toBe(true);
  });

  it("gives an engineer nothing until they are on the hiring team", () => {
    expect(capabilitiesFor("ENGINEERING", null).size).toBe(0);

    const interviewer = capabilitiesFor("ENGINEERING", "INTERVIEWER");
    expect([...interviewer].sort()).toEqual(["submit_scorecard", "view"]);
  });

  it("lets a hiring manager move candidates but not send offers", () => {
    const caps = capabilitiesFor("ENGINEERING", "HIRING_MANAGER");
    expect(caps.has("manage_candidates")).toBe(true);
    expect(caps.has("schedule_interviews")).toBe(true);
    expect(caps.has("manage_offers")).toBe(false);
    expect(caps.has("manage_job")).toBe(false);
  });
});
