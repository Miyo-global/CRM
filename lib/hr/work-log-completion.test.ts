import { describe, expect, it } from "vitest";
import { hasWorkLogContent } from "./work-log-completion";

describe("hasWorkLogContent", () => {
  it("returns false when there are no work-log rows", () => {
    expect(hasWorkLogContent([])).toBe(false);
  });

  it("returns false for empty rows (zero hours, no description)", () => {
    expect(hasWorkLogContent([{ hours: "0", description: "" }])).toBe(false);
    expect(hasWorkLogContent([{ hours: null, description: null }])).toBe(false);
    expect(hasWorkLogContent([{ hours: "0", description: "   " }])).toBe(false);
  });

  it("returns true when hours are logged", () => {
    expect(hasWorkLogContent([{ hours: "1.5", description: null }])).toBe(true);
  });

  it("returns true when a description is provided", () => {
    expect(hasWorkLogContent([{ hours: "0", description: "Fixed payroll bug" }])).toBe(true);
  });

  it("returns true when any row in the day has content", () => {
    expect(
      hasWorkLogContent([
        { hours: "0", description: "" },
        { hours: "2", description: null },
      ]),
    ).toBe(true);
  });
});
