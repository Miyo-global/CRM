import { describe, expect, it } from "vitest";
import { earnedSalary, employmentWindow } from "./rules";
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
