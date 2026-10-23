import { describe, expect, it } from "vitest";
import { attritionRate, diversityRatio, hiringRate, orgHealthScore } from "./executive-kpis";

describe("executive KPIs (R2-HR-02)", () => {
  it("keeps hiring within headcount", () => {
    expect(hiringRate(10, 3)).toBe(30);
    expect(hiringRate(10, 10)).toBe(100);
    expect(hiringRate(0, 0)).toBe(0);
  });

  it("measures attrition against the people employed in the period", () => {
    expect(attritionRate(10, 0)).toBe(0);
    expect(attritionRate(9, 1)).toBe(10);
    expect(attritionRate(0, 0)).toBe(0);
  });

  it("ignores blank genders and is null when none are recorded", () => {
    expect(diversityRatio([{ gender: null, count: 10 }])).toBeNull();
    expect(diversityRatio([])).toBeNull();
    expect(
      diversityRatio([
        { gender: "FEMALE", count: 2 },
        { gender: "MALE", count: 6 },
        { gender: null, count: 2 },
      ]),
    ).toBe(25);
  });

  it("scores missing inputs as neutral", () => {
    expect(orgHealthScore(0, null, null)).toBe(70);
    expect(orgHealthScore(0, 50, 36)).toBe(100);
    expect(orgHealthScore(60, 0, 0)).toBe(0);
  });
});
