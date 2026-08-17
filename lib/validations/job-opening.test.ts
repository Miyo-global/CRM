import { describe, expect, it } from "vitest";
import { jobOpeningSchema, jobOpeningUpdateSchema, JOB_OPENING_LIMITS } from "./job-opening";
import { DEFAULT_CURRENCY } from "@/lib/constants/locale";

const fullPublish = {
  status: "OPEN" as const,
  title: "Senior Software Engineer",
  departmentId: "3",
  role: "Backend Developer",
  type: "FULL_TIME" as const,
  workMode: "HYBRID" as const,
  openings: "2",
  country: "India",
  stateCity: "Karnataka, Bangalore",
  officeLocation: "Head Office - Bangalore",
  salaryMin: "500000",
  salaryMax: "1200000",
  currency: "INR" as const,
  salaryType: "ANNUAL" as const,
  minExperience: "3",
  maxExperience: "8",
  educationLevel: "BACHELORS" as const,
  requiredSkills: ["React", "Node.js"],
  overview: "We are looking for a skilled backend developer to join our team.",
  responsibilities: "Build APIs, own services, mentor juniors.",
  requirements: "3+ years of backend experience with Node.js.",
  hiringManager: "John Doe, HR Manager",
  interviewRounds: ["HR_ROUND", "TECHNICAL_ROUND"] as const,
  questionBank: "Backend Engineering",
  visibility: "PUBLIC" as const,
  priority: "HIGH" as const,
};

describe("jobOpeningSchema — draft", () => {
  it("accepts a draft with only a title", () => {
    const r = jobOpeningSchema.safeParse({ status: "DRAFT", title: "Draft Role" });
    expect(r.success).toBe(true);
  });
  it("still requires a minimally valid title", () => {
    expect(jobOpeningSchema.safeParse({ status: "DRAFT", title: "ab" }).success).toBe(false);
  });
});

describe("jobOpeningSchema — publish", () => {
  it("accepts a complete publish payload and coerces numbers", () => {
    const r = jobOpeningSchema.safeParse(fullPublish);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.openings).toBe(2);
      expect(r.data.salaryMin).toBe(500000);
      expect(r.data.departmentId).toBe(3);
    }
  });

  it("rejects openings above the maximum", () => {
    const r = jobOpeningSchema.safeParse({
      ...fullPublish,
      openings: String(JOB_OPENING_LIMITS.openingsMax + 1),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "openings")).toBe(true);
  });

  it("accepts openings at the maximum", () => {
    const r = jobOpeningSchema.safeParse({
      ...fullPublish,
      openings: String(JOB_OPENING_LIMITS.openingsMax),
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.openings).toBe(JOB_OPENING_LIMITS.openingsMax);
  });

  it("rejects a publish missing required fields", () => {
    const r = jobOpeningSchema.safeParse({ status: "OPEN", title: "Incomplete Role" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("role");
      expect(paths).toContain("departmentId");
      expect(paths).toContain("requiredSkills");
      expect(paths).toContain("questionBank");
      expect(paths).toContain("visibility");
      expect(paths).toContain("priority");
    }
  });

  it("rejects publish with a country not in the allowed list", () => {
    expect(jobOpeningSchema.safeParse({ ...fullPublish, country: "Atlantis" }).success).toBe(false);
  });

  it("rejects max salary below min salary", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, salaryMin: "900000", salaryMax: "500000" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "salaryMax")).toBe(true);
  });

  it("rejects max experience below min experience", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, minExperience: "8", maxExperience: "3" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "minExperience");
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Minimum experience cannot exceed maximum experience");
    }
  });

  it("rejects max experience below min experience on update schema", () => {
    const r = jobOpeningUpdateSchema.safeParse({ ...fullPublish, status: "PAUSED", minExperience: "2", maxExperience: "1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "minExperience");
      expect(issue).toBeDefined();
      expect(issue?.message).toBe("Minimum experience cannot exceed maximum experience");
    }
  });

  it("rejects salaries below the floor (e.g. 8–10)", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, salaryMin: "8", salaryMax: "10" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("salaryMin");
      expect(paths).toContain("salaryMax");
    }
  });

  it("accepts the new job types", () => {
    for (const type of ["CONSULTANT", "APPRENTICESHIP", "COMMISSION_BASED"] as const) {
      expect(jobOpeningSchema.safeParse({ ...fullPublish, type }).success).toBe(true);
    }
  });

  it("rejects publish with overview too short", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, overview: "Too short overview" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "overview")).toBe(true);
      expect(r.error.issues.find((i) => i.path[0] === "overview")?.message).toMatch(/at least 20/);
    }
  });

  it("rejects publish with responsibilities too short", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, responsibilities: "Build API" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "responsibilities")).toBe(true);
      expect(r.error.issues.find((i) => i.path[0] === "responsibilities")?.message).toMatch(/at least 10/);
    }
  });

  it("rejects publish with requirements too short", () => {
    const r = jobOpeningSchema.safeParse({ ...fullPublish, requirements: "3+ years" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "requirements")).toBe(true);
      expect(r.error.issues.find((i) => i.path[0] === "requirements")?.message).toMatch(/at least 10/);
    }
  });

  it("accepts publish with a hiring flow and no interview rounds", () => {
    const { interviewRounds: _, ...withoutRounds } = fullPublish;
    const r = jobOpeningSchema.safeParse({
      ...withoutRounds,
      hiringFlowTemplateId: "1",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hiringFlowTemplateId).toBe(1);
  });

  it("rejects publish without a hiring flow or interview rounds", () => {
    const { interviewRounds: _, ...withoutRounds } = fullPublish;
    const r = jobOpeningSchema.safeParse(withoutRounds);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "hiringFlowTemplateId")).toBe(true);
    }
  });

  it("rejects text exceeding max length", () => {
    const r = jobOpeningSchema.safeParse({
      ...fullPublish,
      overview: "x".repeat(JOB_OPENING_LIMITS.overviewMax + 1),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "overview")).toBe(true);

    const r2 = jobOpeningSchema.safeParse({
      ...fullPublish,
      responsibilities: "x".repeat(JOB_OPENING_LIMITS.longTextMax + 1),
    });
    expect(r2.success).toBe(false);
    if (!r2.success) expect(r2.error.issues.some((i) => i.path[0] === "responsibilities")).toBe(true);
  });
});

describe("jobOpeningSchema — strict title", () => {
  it("rejects a title that does not start with a letter", () => {
    expect(jobOpeningSchema.safeParse({ status: "DRAFT", title: "123 Engineer" }).success).toBe(false);
  });
  it("rejects a title with special characters", () => {
    expect(jobOpeningSchema.safeParse({ status: "DRAFT", title: "Engineer@#$" }).success).toBe(false);
  });
  it("rejects a title with a character repeated 3+ times in a row", () => {
    expect(jobOpeningSchema.safeParse({ status: "DRAFT", title: "Engineerrr" }).success).toBe(false);
  });
  it("collapses surrounding and repeated whitespace", () => {
    const r = jobOpeningSchema.safeParse({ status: "DRAFT", title: "  Senior   Engineer  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("Senior Engineer");
  });
});
