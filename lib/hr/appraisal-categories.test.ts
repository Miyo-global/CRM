import { describe, expect, it } from "vitest";
import { slugifyCategoryName } from "./appraisal-categories";

describe("slugifyCategoryName", () => {
  it("lowercases and joins words with underscores", () => {
    expect(slugifyCategoryName("Goals & KPI Achievement")).toBe("goals_kpi_achievement");
  });
  it("trims leading/trailing separators and strips accents", () => {
    expect(slugifyCategoryName("  Économie / Delivery!  ")).toBe("economie_delivery");
  });
  it("returns empty for symbols only", () => {
    expect(slugifyCategoryName("&&&")).toBe("");
  });
});
