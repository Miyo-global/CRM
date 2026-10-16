import { describe, expect, it } from "vitest";
import { computeHealth, isDoneStatus, isNotStartedStatus } from "./project-health";

const now = new Date("2026-10-15T00:00:00Z");

describe("computeHealth", () => {
  it("uses done percentage thresholds", () => {
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: null, total: 10, done: 7, now })).toEqual({ status: "on_track", donePct: 70 });
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: null, total: 10, done: 3, now }).status).toBe("at_risk");
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: null, total: 10, done: 2, now }).status).toBe("off_track");
  });

  it("is off track once the end date passes with work left", () => {
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: new Date("2026-10-01"), total: 10, done: 9, now }).status).toBe("off_track");
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: new Date("2026-10-01"), total: 2, done: 2, now }).status).toBe("on_track");
  });

  it("treats finished and empty projects as on track", () => {
    expect(computeHealth({ projectStatus: "COMPLETED", endDate: new Date("2020-01-01"), total: 5, done: 0, now }).status).toBe("on_track");
    expect(computeHealth({ projectStatus: "ACTIVE", endDate: null, total: 0, done: 0, now })).toEqual({ status: "on_track", donePct: 0 });
  });
});

describe("status groups", () => {
  it("classifies statuses case-insensitively", () => {
    expect(isDoneStatus("done")).toBe(true);
    expect(isDoneStatus("IN_REVIEW")).toBe(false);
    expect(isNotStartedStatus("TODO")).toBe(true);
  });
});
