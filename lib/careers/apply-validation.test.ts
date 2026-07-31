import { describe, expect, it } from "vitest";
import { careersApplySchema, isValidFullName, parseSkillsList } from "@/lib/careers/apply-validation";

const base = {
  jobPostingId: 1,
  name: "Jane Doe",
  email: "jane@example.com",
  experienceYears: 3,
  resumeUrl: "https://cdn.example.com/o/org/resume.pdf",
};

describe("careersApplySchema", () => {
  it("accepts a minimal valid application", () => {
    expect(careersApplySchema.safeParse(base).success).toBe(true);
  });

  it("rejects names that do not start with a letter", () => {
    expect(careersApplySchema.safeParse({ ...base, name: "123 Jane" }).success).toBe(false);
  });

  it("rejects repeated character runs in names", () => {
    expect(careersApplySchema.safeParse({ ...base, name: "Jaaaane Doe" }).success).toBe(false);
  });

  it("requires experience years", () => {
    expect(careersApplySchema.safeParse({ ...base, experienceYears: undefined }).success).toBe(false);
  });

  it("rejects invalid linkedin urls", () => {
    expect(
      careersApplySchema.safeParse({ ...base, linkedinUrl: "https://example.com/in/jane" }).success,
    ).toBe(false);
  });

  it("rejects skills with invalid characters", () => {
    expect(careersApplySchema.safeParse({ ...base, skills: ["React@#$"] }).success).toBe(false);
  });

  it("rejects duplicate skills", () => {
    const r = careersApplySchema.safeParse({ ...base, skills: ["React", "react"] });
    expect(r.success).toBe(false);
  });

  it("rejects work experience with end before start", () => {
    expect(
      careersApplySchema.safeParse({
        ...base,
        workExperience: [{ company: "Acme Corp", startDate: "2020-01", endDate: "2019-01" }],
      }).success,
    ).toBe(false);
  });

  it("accepts storage-key resume references", () => {
    expect(
      careersApplySchema.safeParse({
        ...base,
        resumeUrl: "o/org_abc/careers/resumes/123-file.pdf",
      }).success,
    ).toBe(true);
  });
});

describe("parseSkillsList", () => {
  it("drops empty tokens from trailing commas", () => {
    expect(parseSkillsList("SALES, HRLL,", [])).toEqual(["SALES", "HRLL"]);
  });
});

describe("isValidFullName", () => {
  it("accepts normal names", () => {
    expect(isValidFullName("Jane Doe")).toBe(true);
  });
  it("rejects symbol-only names", () => {
    expect(isValidFullName("---")).toBe(false);
  });
});
