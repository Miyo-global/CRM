import { z } from "zod";
import { cleanStrictName, cleanOptionalStrictName } from "@/lib/validations/text-rules";

export const JOB_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full-Time" },
  { value: "PART_TIME", label: "Part-Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "APPRENTICESHIP", label: "Apprenticeship" },
  { value: "COMMISSION_BASED", label: "Commission-Based" },
] as const;

export const JOB_TYPE_VALUES = JOB_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const WORK_MODE_OPTIONS = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
] as const;

export const SALARY_TYPE_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "HOURLY", label: "Hourly" },
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "HIGH_SCHOOL", label: "High School" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "BACHELORS", label: "Bachelor's Degree" },
  { value: "MASTERS", label: "Master's Degree" },
  { value: "PHD", label: "PhD" },
  { value: "ANY", label: "Any" },
] as const;

export const INTERVIEW_ROUND_OPTIONS = [
  { value: "HR_ROUND", label: "HR Round" },
  { value: "TECHNICAL_ROUND", label: "Technical Round" },
  { value: "MANAGER_ROUND", label: "Manager Round" },
  { value: "FINAL_ROUND", label: "Final Round" },
] as const;

export const JOB_VISIBILITY_OPTIONS = [
  { value: "INTERNAL", label: "Internal Only" },
  { value: "PUBLIC", label: "Public" },
] as const;

export const JOB_PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

/** Canonical country names for job location (dropdown). */
export const COUNTRY_OPTION_VALUES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "United Arab Emirates",
  "Japan",
  "Netherlands",
  "Ireland",
  "New Zealand",
  "Switzerland",
  "Spain",
  "Italy",
  "Sweden",
  "South Korea",
  "Mexico",
  "Brazil",
  "South Africa",
] as const;

export type JobOpeningCountry = (typeof COUNTRY_OPTION_VALUES)[number];

export const COUNTRY_OPTIONS: { value: JobOpeningCountry; label: string }[] = COUNTRY_OPTION_VALUES.map(
  (value) => ({ value, label: value }),
);

const countryFieldSchema = z.preprocess(
  (v) => (v === undefined || v === null ? "" : String(v).trim()),
  z.union([z.literal(""), z.enum(COUNTRY_OPTION_VALUES)]),
);

export const JOB_OPENING_LIMITS = {
  titleMin: 3,
  titleMax: 150,
  roleMax: 120,
  textMax: 200,
  overviewMin: 20,
  overviewMax: 5000,
  longTextMin: 10,
  longTextMax: 10_000,
  openingsMax: 500,
  salaryFloor: 1000,
  salaryMax: 100_000_000,
  experienceMax: 60,
} as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().int().nonnegative().optional()
);

const optionalStringArray = z.array(z.string().trim().min(1)).optional();

const jobOpeningSharedFields = {
    title: cleanStrictName("Job title", { min: JOB_OPENING_LIMITS.titleMin, max: JOB_OPENING_LIMITS.titleMax }),
    departmentId: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().positive().optional()
    ),
    role: optionalText(JOB_OPENING_LIMITS.roleMax),
    type: z.enum(JOB_TYPE_VALUES).optional(),
    workMode: z.enum(["ON_SITE", "REMOTE", "HYBRID"]).optional(),
    openings: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().min(1).max(JOB_OPENING_LIMITS.openingsMax).optional()
    ),

    country: countryFieldSchema,
    stateCity: cleanOptionalStrictName("State / City", { max: JOB_OPENING_LIMITS.textMax }),
    officeLocation: cleanOptionalStrictName("Office location", { max: JOB_OPENING_LIMITS.textMax }),

    salaryMin: optionalInt,
    salaryMax: optionalInt,
    currency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
    salaryType: z.enum(["MONTHLY", "ANNUAL", "HOURLY"]).optional(),
    bonus: optionalText(JOB_OPENING_LIMITS.textMax),

    minExperience: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().min(0).max(JOB_OPENING_LIMITS.experienceMax).optional()
    ),
    maxExperience: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().min(0).max(JOB_OPENING_LIMITS.experienceMax).optional()
    ),
    educationLevel: z.enum(["HIGH_SCHOOL", "DIPLOMA", "BACHELORS", "MASTERS", "PHD", "ANY"]).optional(),

    requiredSkills: optionalStringArray,
    preferredSkills: optionalStringArray,
    tags: optionalStringArray,

    overview: optionalText(JOB_OPENING_LIMITS.overviewMax),
    responsibilities: optionalText(JOB_OPENING_LIMITS.longTextMax),
    requirements: optionalText(JOB_OPENING_LIMITS.longTextMax),
    benefits: optionalText(JOB_OPENING_LIMITS.longTextMax),

    hiringManager: optionalText(JOB_OPENING_LIMITS.textMax),
    interviewRounds: z.array(z.enum(["HR_ROUND", "TECHNICAL_ROUND", "MANAGER_ROUND", "FINAL_ROUND"])).optional(),
    questionBank: optionalText(JOB_OPENING_LIMITS.textMax),

    resumeRequired: z.boolean().optional(),
    coverLetterRequired: z.boolean().optional(),
    customFields: optionalStringArray,

    visibility: z.enum(["INTERNAL", "PUBLIC"]).optional(),
    applicationDeadline: z.string().trim().optional().or(z.literal("")),

    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    referralEnabled: z.boolean().optional(),
    approvalRequired: z.boolean().optional(),

    hiringFlowTemplateId: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
      z.number().int().positive().optional()
    ),

    applicationFields: z.record(z.string(), z.enum(["required", "optional", "hidden"])).optional(),
} as const;

type JobOpeningRefineData = z.infer<z.ZodObject<typeof jobOpeningSharedFields>> & {
  status: string;
};

function refineJobOpening(d: JobOpeningRefineData, ctx: z.RefinementCtx) {
    const { salaryFloor, salaryMax: salaryCap } = JOB_OPENING_LIMITS;
    const floorLabel = salaryFloor.toLocaleString("en-IN");
    const capLabel = salaryCap.toLocaleString("en-IN");
    if (d.salaryMin != null && d.salaryMin < salaryFloor) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Min salary must be at least ${floorLabel}`, path: ["salaryMin"] });
    }
    if (d.salaryMax != null && d.salaryMax < salaryFloor) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Max salary must be at least ${floorLabel}`, path: ["salaryMax"] });
    }
    if (d.salaryMin != null && d.salaryMin > salaryCap) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Min salary cannot exceed ${capLabel}`, path: ["salaryMin"] });
    }
    if (d.salaryMax != null && d.salaryMax > salaryCap) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Max salary cannot exceed ${capLabel}`, path: ["salaryMax"] });
    }
    if (d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Max salary must be ≥ min salary", path: ["salaryMax"] });
    }
    if (d.minExperience != null && d.maxExperience != null && d.minExperience > d.maxExperience) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum experience cannot exceed maximum experience",
        path: ["minExperience"],
      });
    }
    if (d.applicationDeadline && Number.isNaN(Date.parse(d.applicationDeadline))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid application deadline", path: ["applicationDeadline"] });
    }

    if (d.status !== "OPEN") return;

    const requireText = (key: keyof typeof d, label: string) => {
      const v = d[key];
      if (v == null || v === "") ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required to publish`, path: [key as string] });
    };
    const requireTextWithMin = (key: keyof typeof d, label: string, min: number) => {
      const v = d[key];
      if (v == null || v === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required to publish`, path: [key as string] });
      } else if (typeof v === "string" && v.length < min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be at least ${min} characters`, path: [key as string] });
      }
    };
    requireText("role", "Role");
    requireText("country", "Country");
    requireText("stateCity", "State / City");
    requireText("officeLocation", "Office location");
    requireTextWithMin("overview", "Overview", JOB_OPENING_LIMITS.overviewMin);
    requireTextWithMin("responsibilities", "Responsibilities", JOB_OPENING_LIMITS.longTextMin);
    requireTextWithMin("requirements", "Requirements", JOB_OPENING_LIMITS.longTextMin);
    requireText("hiringManager", "Hiring manager");

    if (d.departmentId == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Department is required to publish", path: ["departmentId"] });
    if (!d.type) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Job type is required to publish", path: ["type"] });
    if (!d.workMode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Work mode is required to publish", path: ["workMode"] });
    if (d.openings == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Number of openings is required to publish", path: ["openings"] });
    if (d.salaryMin == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Min salary is required to publish", path: ["salaryMin"] });
    if (d.salaryMax == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Max salary is required to publish", path: ["salaryMax"] });
    if (!d.currency) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Currency is required to publish", path: ["currency"] });
    if (!d.salaryType) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Salary type is required to publish", path: ["salaryType"] });
    if (d.minExperience == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum experience is required to publish", path: ["minExperience"] });
    if (!d.educationLevel) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Education level is required to publish", path: ["educationLevel"] });
    if (!d.requiredSkills || d.requiredSkills.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one required skill to publish", path: ["requiredSkills"] });
    if (
      !d.hiringFlowTemplateId &&
      (!d.interviewRounds || d.interviewRounds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a hiring flow template to publish",
        path: ["hiringFlowTemplateId"],
      });
    }
    requireText("questionBank", "Question bank mapping");
    if (!d.visibility) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Visibility is required to publish", path: ["visibility"] });
    if (!d.priority) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Priority is required to publish", path: ["priority"] });
}

export const jobOpeningSchema = z
  .object({
    status: z.enum(["DRAFT", "OPEN"]).default("DRAFT"),
    ...jobOpeningSharedFields,
  })
  .superRefine(refineJobOpening);

export type JobOpeningInput = z.infer<typeof jobOpeningSchema>;

export const jobOpeningUpdateSchema = z
  .object({
    status: z.enum(["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"]).default("DRAFT"),
    ...jobOpeningSharedFields,
  })
  .superRefine(refineJobOpening);

export type JobOpeningUpdateInput = z.infer<typeof jobOpeningUpdateSchema>;
