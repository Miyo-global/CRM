import { z } from "zod";
import { getTodayIST } from "@/lib/careers/application-deadline";
import { formatJobPostingLocation, formatJobPostingTitle } from "@/lib/hr/job-posting-format";
import { cleanRequiredName, cleanStrictName } from "@/lib/validations/text-rules";

export const requiredString = (label: string, max = 500) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${characters(max)}`);

function characters(max: number) {
  return `${max} characters`;
}

export const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

export const optionalAttachmentUrl = z
  .string()
  .trim()
  .url("Attachment must be a valid URL")
  .max(2048, "URL is too long")
  .optional()
  .or(z.literal(""));

/**
 * Centralised email schemas.
 * Replaces 6 different email validation approaches scattered across the codebase.
 */
export const requiredEmail = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address");

export const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal(""));

export const positiveAmount = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(999_999_999, "Amount is too large");

export const helpdeskTicketSchema = z.object({
  title: cleanRequiredName("Title", 200, 3),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be at most 5000 characters")
    .optional()
    .or(z.literal("")),
  category: requiredString("Category", 100),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  attachmentUrl: optionalAttachmentUrl,
});

export type HelpdeskTicketFormValues = z.infer<typeof helpdeskTicketSchema>;

export const reimbursementRequestSchema = z.object({
  category: requiredString("Category", 100),
  amount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? NaN : Number(val)),
    positiveAmount,
  ),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  receiptUrl: optionalAttachmentUrl,
});

export type ReimbursementRequestFormValues = z.infer<typeof reimbursementRequestSchema>;

export const createDealFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Deal name is required")
    .max(200, "Deal name must be at most 200 characters")
    .regex(/^[A-Za-z]/, "Deal name must start with a letter"),
  value: z.number().min(0, "Value cannot be negative"),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  probability: z.number().min(0).max(100),
  contactPerson: z
    .string()
    .trim()
    .max(120)
    .regex(/^[A-Za-z\s]*$/, "Contact person can only contain letters")
    .optional()
    .or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  expectedCloseDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type CreateDealFormValues = z.infer<typeof createDealFormSchema>;

export const JOB_POSTING_LIMITS = {
  titleMin: 5,
  titleMax: 150,
  locationMin: 2,
  locationMax: 150,
  descriptionMin: 20,
  descriptionMax: 10_000,
  requirementsMin: 10,
  requirementsMax: 10_000,
  openingsMin: 1,
  openingsMax: 500,

  salaryFloor: 1000,
  salaryMax: 10_000_000,
} as const;

export const JOB_POSTING_SALARY_MAX_MESSAGE = `Maximum salary is ₹1 crore (${JOB_POSTING_LIMITS.salaryMax.toLocaleString("en-IN")})`;

const optionalSalary = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
  z
    .number()
    .min(
      JOB_POSTING_LIMITS.salaryFloor,
      `Salary must be at least ₹${JOB_POSTING_LIMITS.salaryFloor.toLocaleString("en-IN")}`,
    )
    .max(JOB_POSTING_LIMITS.salaryMax, JOB_POSTING_SALARY_MAX_MESSAGE)
    .optional(),
);

export const createJobPostingSchema = z
  .object({
    title: cleanStrictName("Job title", {
      min: JOB_POSTING_LIMITS.titleMin,
      max: JOB_POSTING_LIMITS.titleMax,
    }).transform(formatJobPostingTitle),
    location: cleanStrictName("Location", {
      min: JOB_POSTING_LIMITS.locationMin,
      max: JOB_POSTING_LIMITS.locationMax,
    }).transform(formatJobPostingLocation),
    type: z.enum(
      [
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "INTERNSHIP",
        "FREELANCE",
        "TEMPORARY",
        "CONSULTANT",
        "APPRENTICESHIP",
        "COMMISSION_BASED",
      ],
      { error: "Select a valid job type" },
    ),
    workMode: z.enum(["ON_SITE", "REMOTE", "HYBRID"]).optional(),
    description: z
      .string()
      .trim()
      .min(
        JOB_POSTING_LIMITS.descriptionMin,
        `Description must be at least ${JOB_POSTING_LIMITS.descriptionMin} characters`,
      )
      .max(JOB_POSTING_LIMITS.descriptionMax, `Description must be at most ${JOB_POSTING_LIMITS.descriptionMax} characters`),
    openings: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? NaN : Number(val)),
      z
        .number({ error: "Openings is required" })
        .int("Openings must be a whole number")
        .min(JOB_POSTING_LIMITS.openingsMin, `At least ${JOB_POSTING_LIMITS.openingsMin} opening is required`)
        .max(JOB_POSTING_LIMITS.openingsMax, `Openings must be at most ${JOB_POSTING_LIMITS.openingsMax}`),
    ),
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    requirements: z
      .string()
      .trim()
      .min(
        JOB_POSTING_LIMITS.requirementsMin,
        `Requirements must be at least ${JOB_POSTING_LIMITS.requirementsMin} characters`,
      )
      .max(JOB_POSTING_LIMITS.requirementsMax, `Requirements must be at most ${JOB_POSTING_LIMITS.requirementsMax} characters`),
    applicationDeadline: z
      .string()
      .trim()
      .min(1, "Application deadline is required"),
  })
  .superRefine((d, ctx) => {
    const min = d.salaryMin;
    const max = d.salaryMax;
    if (min != null && max != null && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salaryMax"],
        message: "Max salary must be greater than or equal to min salary",
      });
    }
    if (!Number.isNaN(Date.parse(d.applicationDeadline)) && d.applicationDeadline.slice(0, 10) < getTodayIST()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationDeadline"],
        message: "Application deadline cannot be in the past",
      });
    }
    if (Number.isNaN(Date.parse(d.applicationDeadline))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationDeadline"],
        message: "Application deadline is not a valid date",
      });
    }
  });

export type CreateJobPostingFormValues = z.infer<typeof createJobPostingSchema>;

const ALLOWED_DOC_EXTENSION = /\.(pdf|docx?|xlsx?|png|jpe?g|gif|webp)$/i;
const RISKY_SECOND_EXTENSION = /\.(exe|bat|cmd|sh|js|jar|php|html?|zip|rar|pdf|docx?|xlsx?|png|jpe?g|gif|webp)$/i;

export const onboardingDocFileNameSchema = z
  .string()
  .trim()
  .min(1, "File name is required")
  .max(255, "File name must be at most 255 characters")
  .refine((n) => !/[\\/]/.test(n), "File name cannot contain slashes")
  .refine(
    (n) => ALLOWED_DOC_EXTENSION.test(n),
    "Unsupported file type. Allowed: PDF, Word, Excel or image (e.g. aadhaar-card.pdf, photo.jpg)",
  )
  .refine(
    (n) => !RISKY_SECOND_EXTENSION.test(n.replace(ALLOWED_DOC_EXTENSION, "")),
    "File name must have a single extension (e.g. aadhaar-card.pdf), not a double extension like resume.exe.pdf",
  );

/** Storage key or HTTP URL returned after upload. */
export const onboardingDocFileRefSchema = z
  .string()
  .trim()
  .min(1, "Please upload a file first")
  .max(2048, "File reference is too long");

export const onboardingDocUploadSchema = z.object({
  fileUrl: onboardingDocFileRefSchema,
  fileName: onboardingDocFileNameSchema,
});

export type OnboardingDocUploadFormValues = z.infer<typeof onboardingDocUploadSchema>;
