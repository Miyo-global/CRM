import { describe, expect, it } from "vitest";
import {
  CAREER_LADDER_TITLE_PATTERN,
  createCareerLadderSchema,
  filterCareerLadderTitleInput,
  getCareerLadderTitleError,
} from "./career-ladder";

describe("filterCareerLadderTitleInput", () => {
  it("strips special symbols", () => {
    expect(filterCareerLadderTitleInput("Human resources *(&*(*(^(")).toBe("Human resources &");
  });

  it("allows basic punctuation", () => {
    expect(filterCareerLadderTitleInput("Engineering - R&D / Growth")).toBe(
      "Engineering - R&D / Growth",
    );
  });
});

describe("getCareerLadderTitleError", () => {
  it("rejects titles with only symbols after filtering edge cases", () => {
    expect(getCareerLadderTitleError("12")).toMatch(/letter/);
  });

  it("accepts a valid title", () => {
    expect(getCareerLadderTitleError("Human Resources")).toBeNull();
  });

  it("rejects invalid pattern", () => {
    expect(CAREER_LADDER_TITLE_PATTERN.test("Human resources *(&*(*(^(")).toBe(false);
  });
});

describe("createCareerLadderSchema", () => {
  it("rejects special characters in title", () => {
    const result = createCareerLadderSchema.safeParse({
      title: "Bad * title",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid payload", () => {
    const result = createCareerLadderSchema.safeParse({
      title: "Engineering Career Path",
      department: "Engineering",
      description: "Growth track for engineers.",
    });
    expect(result.success).toBe(true);
  });
});
