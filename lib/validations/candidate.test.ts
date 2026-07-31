import { describe, expect, it } from "vitest";
import { emptyCandidateForm } from "@/features/hr/recruitment/candidates-list/candidate-form";
import {
  buildCandidatePayload,
  validateCandidateForm,
} from "@/features/hr/recruitment/candidates-list/candidate-payload";
import { createCandidateSchema } from "@/lib/validations/candidate";

function validForm() {
  const form = emptyCandidateForm();
  form.firstName = "Tarun";
  form.lastName = "Reddy";
  form.email = "tarun@example.com";
  form.phone = "+918688441355";
  form.location = "Hyderabad, India";
  form.appliedTitle = "Software Developer";
  form.employmentType = "FULL_TIME";
  form.experienceYears = "3";
  form.currentCompany = "Acme Corp";
  form.noticePeriodDays = "30";
  form.currentCtc = "1200000";
  form.expectedCtc = "1500000";
  form.resumeUrl = "o/org-1/candidates/resumes/file.pdf";
  form.education = [{ qualification: "B.Tech", specialization: "CSE", institution: "JNTU", year: "2020" }];
  form.skillEntries = [{ name: "React", skillType: "PRIMARY", proficiency: "ADVANCED" }];
  return form;
}

describe("validateCandidateForm", () => {
  it("accepts a fully valid candidate", () => {
    expect(validateCandidateForm(validForm()).ok).toBe(true);
  });

  it("rejects invalid email", () => {
    const form = validForm();
    form.email = "tarun";
    const result = validateCandidateForm(form);
    expect(result.ok).toBe(false);
    expect(result.errors?.email).toMatch(/valid email/i);
  });

  it("rejects symbol-only location", () => {
    const form = validForm();
    form.location = "(*^&*%*&";
    const result = validateCandidateForm(form);
    expect(result.ok).toBe(false);
    expect(result.errors?.location).toBeTruthy();
  });

  it("rejects child date of birth", () => {
    const form = validForm();
    form.dateOfBirth = "2018-06-05";
    const result = validateCandidateForm(form);
    expect(result.ok).toBe(false);
    expect(result.errors?.dateOfBirth).toMatch(/between/i);
  });

  it("requires primary skill", () => {
    const form = validForm();
    form.skillEntries = [{ name: "Excel", skillType: "SOFT", proficiency: "INTERMEDIATE" }];
    const result = validateCandidateForm(form);
    expect(result.ok).toBe(false);
    expect(result.errors?.skillEntries).toMatch(/Primary/i);
  });
});

describe("buildCandidatePayload", () => {
  it("trims and passes email through validation schema", () => {
    const form = validForm();
    form.email = "  Tarun@Example.COM  ";
    const result = validateCandidateForm(form);
    expect(result.ok).toBe(true);
    const payload = buildCandidatePayload(form);
    const parsed = createCandidateSchema.safeParse({ ...payload, email: form.email.trim() });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("tarun@example.com");
    }
  });
});
