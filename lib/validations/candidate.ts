import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { isValidResumeReference } from "@/lib/careers/apply-validation";
import {
  collapseSpaces,
  cleanOptionalName,
  cleanOptionalStrictName,
  cleanOptionalText,
  cleanRequiredName,
  cleanStrictName,
  hasRepeatedRun,
  startsWithLetter,
} from "@/lib/validations/text-rules";

export const CANDIDATE_SOURCES = [
  "DIRECT",
  "REFERRAL",
  "LINKEDIN",
  "NAUKRI",
  "INDEED",
  "JOB_PORTAL",
  "CAMPUS",
  "CAREERS_PAGE",
] as const;

export const CANDIDATE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "DIRECT", label: "Direct" },
  { value: "REFERRAL", label: "Referral" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "NAUKRI", label: "Naukri" },
  { value: "INDEED", label: "Indeed" },
  { value: "JOB_PORTAL", label: "Job Portal" },
  { value: "CAMPUS", label: "Campus" },
  { value: "CAREERS_PAGE", label: "Careers Page" },
];

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "FREELANCE", label: "Freelance" },
];

export const EMPLOYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "SERVING_NOTICE", label: "Serving notice period" },
  { value: "STUDENT", label: "Student" },
  { value: "FREELANCING", label: "Freelancing" },
];

export const WORK_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "ONSITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
];

export const WORK_AUTHORIZATION_OPTIONS: { value: string; label: string }[] = [
  { value: "CITIZEN", label: "Citizen" },
  { value: "PERMANENT_RESIDENT", label: "Permanent resident" },
  { value: "WORK_VISA", label: "Work visa" },
  { value: "REQUIRES_SPONSORSHIP", label: "Requires sponsorship" },
  { value: "NOT_AUTHORIZED", label: "Not authorized" },
];

export const SALARY_CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "SGD", label: "SGD (S$)" },
  { value: "AUD", label: "AUD (A$)" },
  { value: "CAD", label: "CAD (C$)" },
];

export const SKILL_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "SOFT", label: "Soft Skill" },
];

export const SKILL_PROFICIENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

export const CANDIDATE_FORM_LIMITS = {
  nameMax: 50,
  emailMax: 254,
  locationMax: 120,
  appliedTitleMax: 150,
  notesMax: 5000,
  ctcMin: 1_000,
  ctcMax: 100_000_000,
  minAge: 16,
  maxAge: 80,
  minPrimarySkills: 1,
} as const;

export const skillEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Skill name is required")
    .max(60, "Skill name is too long")
    .refine((v) => /^[A-Za-z0-9+#.\-\s]+$/.test(v), "Skill can only contain letters, numbers, spaces, and + # . -"),
  skillType: z.enum(["PRIMARY", "SECONDARY", "TECHNICAL", "SOFT"]),
  proficiency: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
});

export type CandidateSkillEntry = z.infer<typeof skillEntrySchema>;

export const educationEntrySchema = z.object({
  qualification: z.string().min(1).max(200),
  specialization: z.string().max(200).optional(),
  institution: z.string().max(200).optional(),
  year: z.string().max(20).optional(),
});

export type CandidateEducationEntry = z.infer<typeof educationEntrySchema>;

const YEAR_RE = /^(19|20)\d{2}$/;
const REQUISITION_ID_RE = /^[A-Z0-9][A-Z0-9_-]{2,49}$/i;
const PERSON_NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;

const emptyToUndefined = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
};

function personNameSchema(label: string, max = CANDIDATE_FORM_LIMITS.nameMax) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .min(2, `${label} must be at least 2 characters`)
        .max(max, `${label} must be at most ${max} characters`)
        .refine((v) => startsWithLetter(v), `${label} must start with a letter`)
        .refine((v) => PERSON_NAME_RE.test(v), `${label} can only contain letters, spaces, . ' -`)
        .refine((v) => !hasRepeatedRun(v), `${label} cannot repeat the same character 3 or more times in a row`),
    );
}

const requiredPhone = z
  .string({ error: "Phone number is required" })
  .trim()
  .min(1, "Phone number is required")
  .refine((v) => isValidPhoneNumber(v), "Enter a valid phone number");

const optionalPhone = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .refine((v) => isValidPhoneNumber(v), "Enter a valid alternate phone number")
    .optional(),
);

const optionalLinkedin = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => {
      try {
        return new URL(v).hostname.includes("linkedin.com");
      } catch {
        return false;
      }
    }, "Enter a valid LinkedIn URL (linkedin.com)")
    .optional(),
);

const optionalGithub = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => {
      try {
        const host = new URL(v).hostname;
        return host.includes("github.com") || host.includes("gitlab.com");
      } catch {
        return false;
      }
    }, "Enter a valid GitHub or GitLab URL")
    .optional(),
);

const optionalHttpUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("Enter a valid URL starting with http:// or https://").max(500).optional(),
);

const strictEducationSchema = educationEntrySchema.extend({
  qualification: cleanRequiredName("Qualification", 200, 2),
  specialization: z.preprocess(emptyToUndefined, cleanOptionalName("Specialization", 200).optional()),
  institution: z.preprocess(emptyToUndefined, cleanOptionalName("Institution", 200).optional()),
  year: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(YEAR_RE, "Graduation year must be a 4-digit year (e.g. 2021)")
      .refine((y) => {
        const n = Number(y);
        const now = new Date().getFullYear();
        return n >= 1950 && n <= now + 1;
      }, "Graduation year is out of range")
      .optional(),
  ),
});

const genderValues = GENDER_OPTIONS.map((g) => g.value);
const employmentTypeValues = EMPLOYMENT_TYPE_OPTIONS.map((e) => e.value);

function ageFromDob(isoDate: string): number | null {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

function applyCreateCandidateRefinements(data: z.infer<typeof createCandidateBaseSchema>, ctx: z.RefinementCtx) {
  if (data.dateOfBirth) {
    const age = ageFromDob(data.dateOfBirth);
    if (age === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateOfBirth"], message: "Enter a valid date of birth" });
    } else if (age < CANDIDATE_FORM_LIMITS.minAge || age > CANDIDATE_FORM_LIMITS.maxAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: `Candidate must be between ${CANDIDATE_FORM_LIMITS.minAge} and ${CANDIDATE_FORM_LIMITS.maxAge} years old`,
      });
    }
  }

  if (data.applicationDate) {
    const d = new Date(data.applicationDate);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["applicationDate"], message: "Enter a valid application date" });
    } else if (d > new Date()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["applicationDate"], message: "Application date cannot be in the future" });
    }
  }

  if (data.availableFrom) {
    const d = new Date(data.availableFrom);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["availableFrom"], message: "Enter a valid available-from date" });
    }
  }

  const primarySkills = data.skillEntries.filter((s) => s.skillType === "PRIMARY");
  if (primarySkills.length < CANDIDATE_FORM_LIMITS.minPrimarySkills) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["skillEntries"],
      message: "Add at least one Primary skill",
    });
  }

  if (data.experienceYears > 0 && !data.currentCompany?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentCompany"],
      message: "Current company is required when experience is greater than 0",
    });
  }

  if (
    data.relevantExperienceMonths != null &&
    data.relevantExperienceMonths > Math.ceil(data.experienceYears * 12)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["relevantExperienceMonths"],
      message: "Relevant experience cannot exceed total experience",
    });
  }

  if (data.expectedCtc < data.currentCtc * 0.5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expectedCtc"],
      message: "Expected CTC looks unusually low compared to current CTC",
    });
  }

  if (data.source === "REFERRAL" && !data.referralName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referralName"],
      message: "Referral employee name is required when source is Referral",
    });
  }
}

const createCandidateBaseSchema = z.object({
  firstName: personNameSchema("First name"),
  lastName: personNameSchema("Last name"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .max(CANDIDATE_FORM_LIMITS.emailMax, "Email is too long")
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  phone: requiredPhone,
  alternatePhone: optionalPhone,
  dateOfBirth: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  gender: z.preprocess(
    emptyToUndefined,
    z.enum(genderValues as [string, ...string[]], { error: "Select a valid gender" }).optional(),
  ),
  location: cleanStrictName("Current location", { min: 3, max: CANDIDATE_FORM_LIMITS.locationMax }),
  preferredLocation: cleanOptionalStrictName("Preferred location", { max: CANDIDATE_FORM_LIMITS.locationMax }),

  appliedTitle: cleanStrictName("Applied job title", {
    min: 3,
    max: CANDIDATE_FORM_LIMITS.appliedTitleMax,
  }),
  appliedDepartment: z.preprocess(emptyToUndefined, cleanOptionalName("Department", 120).optional()),
  currentRole: z.preprocess(emptyToUndefined, cleanOptionalName("Current designation", 200).optional()),
  jobPostingId: z.number().int().positive().optional().nullable(),
  requisitionId: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(50, "Requisition ID is too long")
      .regex(REQUISITION_ID_RE, "Requisition ID must be 3–50 letters, numbers, - or _")
      .optional(),
  ),
  employmentType: z.enum(employmentTypeValues as [string, ...string[]], {
    error: "Employment type is required",
  }),
  source: z.enum(CANDIDATE_SOURCES),
  applicationDate: z.preprocess(emptyToUndefined, z.string().trim().optional()),

  experienceYears: z
    .number({ error: "Total experience is required" })
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years"),
  relevantExperienceMonths: z.number().int().min(0).max(720).optional(),
  currentCompany: z.preprocess(emptyToUndefined, cleanOptionalName("Current company", 200).optional()),
  currentEmploymentStatus: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  noticePeriodDays: z
    .number({ error: "Notice period is required" })
    .int("Notice period must be a whole number of days")
    .min(0, "Notice period cannot be negative")
    .max(365, "Notice period cannot exceed 365 days"),
  availableFrom: z.preprocess(emptyToUndefined, z.string().trim().optional()),

  education: z
    .array(strictEducationSchema)
    .min(1, "Add at least one qualification")
    .max(10, "At most 10 qualifications"),
  skillEntries: z.array(skillEntrySchema).min(1, "Add at least one skill"),
  skills: z.array(z.string().trim().min(1).max(60)).optional(),

  currentCtc: z
    .number({ error: "Current CTC is required" })
    .min(CANDIDATE_FORM_LIMITS.ctcMin, `Current CTC must be at least ${CANDIDATE_FORM_LIMITS.ctcMin}`)
    .max(CANDIDATE_FORM_LIMITS.ctcMax, "Current CTC is too high"),
  expectedCtc: z
    .number({ error: "Expected CTC is required" })
    .min(CANDIDATE_FORM_LIMITS.ctcMin, `Expected CTC must be at least ${CANDIDATE_FORM_LIMITS.ctcMin}`)
    .max(CANDIDATE_FORM_LIMITS.ctcMax, "Expected CTC is too high"),
  salaryCurrency: z.preprocess(emptyToUndefined, z.string().trim().max(10).optional()),

  resumeUrl: z
    .string({ error: "Resume is required" })
    .trim()
    .min(1, "Resume upload is required")
    .refine(isValidResumeReference, "Upload a valid resume file"),
  coverLetterUrl: optionalHttpUrl,
  portfolioUrl: optionalHttpUrl,
  linkedinUrl: optionalLinkedin,
  githubUrl: optionalGithub,

  workAuthorization: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  willingToRelocate: z.boolean().optional(),
  preferredWorkMode: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  referralName: z.preprocess(emptyToUndefined, cleanOptionalName("Referral name", 120).optional()),
  notes: z.preprocess(emptyToUndefined, cleanOptionalText("Notes", CANDIDATE_FORM_LIMITS.notesMax).optional()),
});

export const createCandidateSchema = createCandidateBaseSchema.superRefine(applyCreateCandidateRefinements);

export const updateCandidateSchema = createCandidateBaseSchema.partial().extend({
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
});

export type CreateCandidateFormInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateFormInput = z.infer<typeof updateCandidateSchema>;

export function mapCandidateFormErrors(issues: z.ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function sanitizePersonNameInput(value: string): string {
  return value.replace(/[^\p{L}\s.'-]/gu, "");
}

export function sanitizeLocationInput(value: string): string {
  return value.replace(/[^\p{L}\p{N} \-&/.,'()]/gu, "");
}

export function sanitizeJobTitleInput(value: string): string {
  return sanitizeLocationInput(value);
}

export function sanitizeRequisitionInput(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}
