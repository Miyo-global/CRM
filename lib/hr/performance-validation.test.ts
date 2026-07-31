import { describe, expect, it } from "vitest";
import {
  validateNameField,
  validateTextField,
  validateTargetValue,
  sanitizeTargetValueInput,
  clampRatingInput,
  addMonthsEndDate,
  validateReviewCycleForm,
  validateReviewForm,
  validateGoalForm,
  validateMeetingForm,
  validatePipForm,
} from "./performance-validation";

describe("validateNameField", () => {
  it("requires a value and enforces length + charset", () => {
    expect(validateNameField("", "Cycle name")).toMatch(/required/i);
    expect(validateNameField("ab", "Cycle name")).toMatch(/at least/i);
    expect(validateNameField("a".repeat(101), "Cycle name")).toMatch(/or fewer/i);
    expect(validateNameField("Q2 2026 Review", "Cycle name")).toBeUndefined();
    expect(validateNameField("Bad <script>", "Cycle name")).toMatch(/can only contain/i);
  });
});

describe("validateTextField", () => {
  it("treats empty as optional unless required", () => {
    expect(validateTextField("", "Description")).toBeUndefined();
    expect(validateTextField("", "Description", { required: true })).toMatch(/required/i);
  });
  it("rejects angle brackets", () => {
    expect(validateTextField("hello <b>", "Description")).toMatch(/cannot contain/i);
  });
});

describe("validateTargetValue", () => {
  it("accepts positive numbers within digit cap", () => {
    expect(validateTargetValue("100")).toBeUndefined();
    expect(validateTargetValue("1234567890")).toBeUndefined();
    expect(validateTargetValue("")).toBeUndefined();
  });
  it("rejects negatives, non-numerics, and over-long values", () => {
    expect(validateTargetValue("-5")).toMatch(/positive number/i);
    expect(validateTargetValue("12a")).toMatch(/positive number/i);
    expect(validateTargetValue("12345678901")).toMatch(/at most 10 digits/i);
  });
});

describe("sanitizeTargetValueInput", () => {
  it("strips non-numeric characters and caps digits", () => {
    expect(sanitizeTargetValueInput("-12a3")).toBe("123");
    expect(sanitizeTargetValueInput("1.2.3")).toBe("1.23");
    expect(sanitizeTargetValueInput("123456789012")).toBe("1234567890");
  });
});

describe("clampRatingInput", () => {
  it("clamps to 1..5 and allows empty", () => {
    expect(clampRatingInput("")).toBe("");
    expect(clampRatingInput("0")).toBe("1");
    expect(clampRatingInput("9")).toBe("5");
    expect(clampRatingInput("3")).toBe("3");
  });
});

describe("addMonthsEndDate", () => {
  it("returns the day before the start + N months", () => {
    expect(addMonthsEndDate("2026-01-01", 3)).toBe("2026-03-31");
    expect(addMonthsEndDate("2026-01-01", 12)).toBe("2026-12-31");
    expect(addMonthsEndDate("bad", 3)).toBe("");
  });
});

describe("validateReviewCycleForm", () => {
  it("flags deadline before start and before org start date", () => {
    const e = validateReviewCycleForm({
      name: "Annual 2026",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      deadline: "2025-12-15",
      orgStartDate: "2025-06-01",
    });
    expect(e.deadline).toMatch(/on or after the period start/i);
  });
  it("flags start before org start date", () => {
    const e = validateReviewCycleForm({
      name: "Annual 2026",
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
      deadline: "",
      orgStartDate: "2025-06-01",
    });
    expect(e.periodStart).toMatch(/organization/i);
  });
  it("passes a clean cycle", () => {
    expect(
      validateReviewCycleForm({
        name: "Q2 2026",
        periodStart: "2026-04-01",
        periodEnd: "2026-06-30",
        deadline: "2026-06-30",
        orgStartDate: "2025-06-01",
      })
    ).toEqual({});
  });
});

describe("validateReviewForm", () => {
  it("blocks start before joining date and outside cycle range", () => {
    expect(
      validateReviewForm({
        employeeId: "u1",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        joiningDate: "2026-02-01",
      }).periodStart
    ).toMatch(/joining date/i);
    expect(
      validateReviewForm({
        employeeId: "u1",
        periodStart: "2026-01-01",
        periodEnd: "2026-07-31",
        cycleStart: "2026-01-01",
        cycleEnd: "2026-06-30",
      }).periodEnd
    ).toMatch(/cycle/i);
  });
});

describe("validateGoalForm", () => {
  it("validates title, target value and date order", () => {
    const e = validateGoalForm({
      userId: "",
      title: "x",
      description: "ok",
      targetValue: "-3",
      startDate: "2026-05-01",
      endDate: "2026-04-01",
    });
    expect(e.userId).toBeDefined();
    expect(e.title).toMatch(/at least/i);
    expect(e.targetValue).toMatch(/positive/i);
    expect(e.endDate).toMatch(/on or after/i);
  });
});

describe("validateMeetingForm", () => {
  it("validates duration and meeting link", () => {
    expect(
      validateMeetingForm({ employeeId: "u1", date: "2026-06-20", time: "10:00", duration: "5", meetingLink: "" })
        .duration
    ).toMatch(/between 15 and 180/i);
    expect(
      validateMeetingForm({ employeeId: "u1", date: "2026-06-20", time: "10:00", duration: "30", meetingLink: "notaurl" })
        .meetingLink
    ).toMatch(/valid URL/i);
    expect(
      validateMeetingForm({
        employeeId: "u1",
        date: "2026-06-20",
        time: "10:00",
        duration: "30",
        meetingLink: "https://meet.google.com/abc",
      })
    ).toEqual({});
  });
});

describe("validatePipForm", () => {
  const base = {
    userId: "u1",
    hrRepId: "hr1",
    reasons: [
      {
        category: "POOR_PERFORMANCE",
        description: "Consistently missing deadlines across sprints.",
      },
    ],
    evidence: "Sprint 4 and 5 were late by 2 weeks.",
    areas: "Productivity,Quality",
    goals: [{ title: "Hit sprint commitments", successCriteria: "Complete 90% of committed points.", deadline: "2026-06-15" }],
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    reviewMethod: "1:1 Meeting",
    expectedImprovement: "Meet expectations consistently",
    consequences: "Possible escalation",
  };
  it("passes a complete valid PIP", () => {
    expect(validatePipForm(base)).toEqual({});
  });
  it("flags goal deadline outside the PIP period", () => {
    const result = validatePipForm({ ...base, goals: [{ title: "Hit sprint commitments", successCriteria: "Complete 90% of committed points.", deadline: "2026-07-15" }] });
    expect(result["goals.0.deadline"]).toMatch(/within the PIP/i);
  });
  it("flags employee == HR rep", () => {
    expect(validatePipForm({ ...base, hrRepId: "u1" }).hrRepId).toMatch(/different from the employee/i);
  });
});
