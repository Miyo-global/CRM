import { describe, expect, it } from "vitest";
import {
  validateTemplateName,
  validateTemplateSubject,
  validateTemplateBody,
  validateTemplateForm,
  TEMPLATE_NAME_MAX,
  TEMPLATE_NAME_MIN,
  TEMPLATE_SUBJECT_MIN,
  TEMPLATE_BODY_MIN,
  TEMPLATE_BODY_MAX,
} from "./email-template-validation";

describe("validateTemplateName", () => {
  it("rejects an empty / whitespace-only name", () => {
    expect(validateTemplateName("")).toMatch(/required/i);
    expect(validateTemplateName("   ")).toMatch(/required/i);
  });

  it("enforces the minimum length", () => {
    expect(validateTemplateName("ab")).toMatch(/at least/i);
    expect(validateTemplateName("a".repeat(TEMPLATE_NAME_MIN))).toBeUndefined();
  });

  it("enforces the maximum length", () => {
    expect(validateTemplateName("a".repeat(TEMPLATE_NAME_MAX))).toBeUndefined();
    expect(validateTemplateName("a".repeat(TEMPLATE_NAME_MAX + 1))).toMatch(/or fewer/i);
  });

  it("accepts letters, numbers, spaces and the allowed punctuation", () => {
    expect(validateTemplateName("Late coming — first warning")).toBeUndefined();
    expect(validateTemplateName("Offer letter (basic)")).toBeUndefined();
    expect(validateTemplateName("Warning / Discipline & Attendance")).toBeUndefined();
    expect(validateTemplateName("Probation: day 1")).toBeUndefined();
  });

  it("rejects disallowed special characters", () => {
    expect(validateTemplateName("Hello <script>")).toMatch(/can only contain/i);
    expect(validateTemplateName("Promo!! 100% off")).toMatch(/can only contain/i);
    expect(validateTemplateName("name{{inject}}")).toMatch(/can only contain/i);
    expect(validateTemplateName("a@b.com")).toMatch(/can only contain/i);
  });
});

describe("validateTemplateSubject", () => {
  it("requires a non-empty subject", () => {
    expect(validateTemplateSubject("")).toMatch(/required/i);
  });

  it("enforces the minimum length", () => {
    expect(validateTemplateSubject("a".repeat(TEMPLATE_SUBJECT_MIN - 1))).toMatch(/at least/i);
    expect(validateTemplateSubject("Welcome aboard")).toBeUndefined();
  });

  it("allows merge placeholders in the subject", () => {
    expect(validateTemplateSubject("Welcome {{name}} to the team")).toBeUndefined();
  });
});

describe("validateTemplateBody", () => {
  it("requires a non-empty body", () => {
    expect(validateTemplateBody("")).toMatch(/required/i);
  });

  it("enforces the minimum length", () => {
    expect(validateTemplateBody("a".repeat(TEMPLATE_BODY_MIN - 1))).toMatch(/at least/i);
    expect(validateTemplateBody("Hello there, welcome!")).toBeUndefined();
  });

  it("enforces the maximum length", () => {
    expect(validateTemplateBody("a".repeat(TEMPLATE_BODY_MAX + 1))).toMatch(/or fewer/i);
  });
});

describe("validateTemplateForm", () => {
  it("returns no errors for a fully valid form", () => {
    expect(
      validateTemplateForm({
        name: "Welcome email",
        subject: "Welcome to the team",
        body: "We are thrilled to have you on board.",
      })
    ).toEqual({});
  });

  it("reports only the missing fields, not the provided ones", () => {
    const errors = validateTemplateForm({ name: "My Template", subject: "", body: "" });
    expect(errors.name).toBeUndefined();
    expect(errors.subject).toMatch(/subject/i);
    expect(errors.body).toMatch(/body/i);
  });

  it("never echoes the template name back in the messages", () => {
    const errors = validateTemplateForm({ name: "Quarterly Bonus", subject: "", body: "" });
    const combined = Object.values(errors).join(" ");
    expect(combined).not.toContain("Quarterly Bonus");
  });
});
