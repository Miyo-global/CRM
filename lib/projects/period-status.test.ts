import { describe, expect, it } from "vitest";
import { canCompletePeriod, periodStatus } from "./period-status";

const today = "2026-10-16";

describe("periodStatus (QA-0074, QA-0075)", () => {
  it("does not call a period completed before it ends", () => {
    expect(
      periodStatus({ storedStatus: "COMPLETED", startDate: "2026-10-01", endDate: "2026-10-30", today }),
    ).toBe("active");
  });

  it("reports a started period as active, not upcoming", () => {
    expect(periodStatus({ storedStatus: "draft", startDate: "2026-10-10", endDate: "2026-10-30", today })).toBe("active");
  });

  it("reports a period that has not begun as upcoming", () => {
    expect(periodStatus({ storedStatus: "draft", startDate: "2026-11-01", endDate: "2026-11-30", today })).toBe("upcoming");
  });

  it("reports a finished period as ended, or completed when marked", () => {
    expect(periodStatus({ storedStatus: "active", startDate: "2026-09-01", endDate: "2026-09-30", today })).toBe("ended");
    expect(periodStatus({ storedStatus: "completed", startDate: "2026-09-01", endDate: "2026-09-30", today })).toBe("completed");
  });

  it("keeps a planned sprint upcoming until it is started (R2-PRJ-03)", () => {
    expect(periodStatus({ storedStatus: "PLANNED", startDate: today, endDate: "2026-10-30", today })).toBe("upcoming");
  });

  it("keeps a cancellation", () => {
    expect(periodStatus({ storedStatus: "CANCELLED", startDate: "2026-10-01", endDate: "2026-10-30", today })).toBe("cancelled");
  });

  it("offers completion only for a running or finished period", () => {
    expect(canCompletePeriod("upcoming")).toBe(false);
    expect(canCompletePeriod("active")).toBe(true);
    expect(canCompletePeriod("ended")).toBe(true);
    expect(canCompletePeriod("completed")).toBe(false);
  });
});
