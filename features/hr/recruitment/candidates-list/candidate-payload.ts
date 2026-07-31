import type { CandidateFormState } from "./candidate-form";
import {
  createCandidateSchema,
  mapCandidateFormErrors,
} from "@/lib/validations/candidate";

function num(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

export interface CandidateValidationResult {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export function validateCandidateForm(
  form: CandidateFormState,
): CandidateValidationResult {
  const payload = buildCandidatePayload(form);
  const result = createCandidateSchema.safeParse(payload);
  if (!result.success) {
    const errors = mapCandidateFormErrors(result.error.issues);
    const message =
      result.error.issues[0]?.message ?? "Please fix the highlighted fields";
    return { ok: false, message, errors };
  }
  return { ok: true };
}

/** Validated payload with schema transforms applied (e.g. lowercase email). */
export function buildValidatedCandidatePayload(form: CandidateFormState) {
  const payload = buildCandidatePayload(form);
  const result = createCandidateSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("buildValidatedCandidatePayload called with invalid form");
  }
  return result.data;
}

export function buildCandidatePayload(form: CandidateFormState) {
  const cleanedEducation = form.education
    .filter((e) => e.qualification.trim() !== "")
    .map((e) => ({
      qualification: e.qualification.trim(),
      ...(e.specialization?.trim() ? { specialization: e.specialization.trim() } : {}),
      ...(e.institution?.trim() ? { institution: e.institution.trim() } : {}),
      ...(e.year?.trim() ? { year: e.year.trim() } : {}),
    }));

  const cleanedSkillEntries = form.skillEntries.filter((s) => s.name.trim() !== "");
  const skillNames = cleanedSkillEntries.map((s) => s.name);

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.toString().trim(),
    alternatePhone: str(form.alternatePhone.toString()),
    dateOfBirth: str(form.dateOfBirth),
    gender: str(form.gender),
    location: str(form.location),
    preferredLocation: str(form.preferredLocation),

    appliedTitle: str(form.appliedTitle),
    appliedDepartment: str(form.appliedDepartment),
    jobPostingId: form.jobPostingId.trim() ? Number(form.jobPostingId) : undefined,
    requisitionId: str(form.requisitionId),
    employmentType: str(form.employmentType),
    source: (str(form.source) ?? "DIRECT") as typeof form.source,
    applicationDate: str(form.applicationDate),

    experienceYears: num(form.experienceYears),
    relevantExperienceMonths: num(form.relevantExperienceMonths),
    currentCompany: str(form.currentCompany),
    currentRole: str(form.currentRole),
    currentEmploymentStatus: str(form.currentEmploymentStatus),
    noticePeriodDays: num(form.noticePeriodDays),
    availableFrom: str(form.availableFrom),

    education: cleanedEducation,
    skillEntries: cleanedSkillEntries,
    skills: skillNames.length > 0 ? skillNames : undefined,

    currentCtc: num(form.currentCtc),
    expectedCtc: num(form.expectedCtc),
    salaryCurrency: str(form.salaryCurrency),

    resumeUrl: str(form.resumeUrl),
    coverLetterUrl: str(form.coverLetterUrl),
    portfolioUrl: str(form.portfolioUrl),
    linkedinUrl: str(form.linkedinUrl),
    githubUrl: str(form.githubUrl),

    workAuthorization: str(form.workAuthorization),
    willingToRelocate: form.willingToRelocate,
    preferredWorkMode: str(form.preferredWorkMode),
    referralName: str(form.referralName),
    notes: str(form.notes),
  };
}
