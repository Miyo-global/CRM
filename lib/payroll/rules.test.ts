import { describe, expect, it } from "vitest";
import { earnedSalary, employmentWindow, joinerProrationNote } from "./rules";
describe("proration divides by 31 (QA-0053)", () => {
  it("prorates a 30-day month by 31, not 30", () => {
    const window = employmentWindow({ month: "2026-09", joiningDate: "2026-09-20" });
    // 20 Sep to 30 Sep is 11 days.
    expect(window.daysEmployed).toBe(11);
    expect(earnedSalary(31000, window)).toBe(11000);
  });

  it("pays the full salary for a whole month", () => {
    const window = employmentWindow({ month: "2026-09" });
    expect(earnedSalary(31000, window)).toBe(31000);
  });
});

describe("incomplete-month banner for joiners (FR1-005)", () => {
  it("pays the rest of a mid-run month as present for someone employed all month", () => {
    const window = employmentWindow({ month: "2026-10", joiningDate: "2025-01-01", exitDate: null, todayIst: "2026-10-26" });
    expect(earnedSalary(10_000, window)).toBe(10_000);
    expect(joinerProrationNote("2026-10", "2025-01-01")).toBeNull();
  });

  it("explains that a mid-month joiner is paid from the joining date", () => {
    const window = employmentWindow({ month: "2026-10", joiningDate: "2026-10-26", exitDate: null, todayIst: "2026-10-26" });
    expect(earnedSalary(10_000, window)).toBe(1935.48);
    expect(joinerProrationNote("2026-10", "2026-10-26")).toBe(
      "Pay starts on the joining date, so it covers 6 days of this month.",
    );
  });
});
