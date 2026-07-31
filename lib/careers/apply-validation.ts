import { z } from "zod";
import { getTodayIST } from "@/lib/careers/application-deadline";
import {
  collapseSpaces,
  hasRepeatedRun,
  startsWithLetter,
  cleanOptionalStrictName,
  cleanOptionalName,
  cleanRequiredName,
} from "@/lib/validations/text-rules";

export const CAREERS_APPLY_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  phoneMax: 20,
  locationMax: 120,
  urlMax: 500,
  currentRoleMax: 120,
  experienceYearsMax: 80,
  skillItemMax: 50,
  maxSkills: 20,
  maxCoreSkills: 10,
  maxAdditionalSkills: 10,
  maxEducation: 20,
  maxWorkExperience: 20,
  maxCustomLinks: 4,
  coverLetterMax: 5000,
  workDescriptionMax: 2000,
} as const;

export const FULL_NAME_RE = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;
export const LINKEDIN_URL_RE = /^https?:\/\/([\w-]+\.)?linkedin\.com\/.+/i;
export const GITHUB_URL_RE = /^https?:\/\/([\w-]+\.)?github\.com\/.+/i;
export const YEAR_RE = /^(19|20)\d{2}$/;
export const WORK_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const SKILL_ITEM_PATTERN = /^[A-Za-z0-9+#.\-\s]+$/;

function currentMonthIST(): string {
  return getTodayIST().slice(0, 7);
}

export function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

export function isValidFullName(value: string): boolean {
  const t = collapseSpaces(value);
  return (
    t.length >= CAREERS_APPLY_LIMITS.nameMin &&
    t.length <= CAREERS_APPLY_LIMITS.nameMax &&
    startsWithLetter(t) &&
    FULL_NAME_RE.test(t) &&
    !hasRepeatedRun(t)
  );
}

export function isValidPhone(value: string): boolean {
  const digits = digitCount(value);
  return digits >= 8 && digits <= 15;
}

const emptyToUndefined = (v: unknown) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
};

/** R2 public URL or org-scoped storage key from upload. */
export function isValidResumeReference(value: string): boolean {
  const v = value.trim();
  if (/^https?:\/\/.+/i.test(v)) return true;
  return /^o\/[a-zA-Z0-9_-]+\/.+/.test(v);
}

const personNameSchema = z
  .string()
  .trim()
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .min(CAREERS_APPLY_LIMITS.nameMin, `Full name must be at least ${CAREERS_APPLY_LIMITS.nameMin} characters.`)
      .max(CAREERS_APPLY_LIMITS.nameMax, "Full name is too long.")
      .refine((v) => startsWithLetter(v), "Full name must start with a letter.")
      .refine((v) => FULL_NAME_RE.test(v), "Enter a valid full name (letters, spaces, . ' - only).")
      .refine(
        (v) => !hasRepeatedRun(v),
        "Full name cannot repeat the same character 3 or more times in a row.",
      ),
  );

const optionalUrl = (re: RegExp, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(CAREERS_APPLY_LIMITS.urlMax)
      .refine((v) => re.test(v), message)
      .optional(),
  );

const skillItemSchema = z
  .string()
  .trim()
  .min(1, "Skill is too short.")
  .max(CAREERS_APPLY_LIMITS.skillItemMax, `Each skill must be at most ${CAREERS_APPLY_LIMITS.skillItemMax} characters.`)
  .refine(
    (v) => SKILL_ITEM_PATTERN.test(v),
    "Skills can only contain letters, numbers, spaces, and + # . -",
  );

const educationSchema = z.object({
  qualification: cleanRequiredName("Qualification", 200, 2),
  institution: z.preprocess(emptyToUndefined, cleanOptionalName("Institution", 200).optional()),
  year: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(YEAR_RE, "Year must be a 4-digit year.").optional(),
  ),
});

const workExperienceSchema = z
  .object({
    company: cleanRequiredName("Company", 200, 2),
    title: z.preprocess(emptyToUndefined, cleanOptionalName("Job title", 200).optional()),
    startDate: z
      .string({ message: "Select a start month." })
      .trim()
      .regex(WORK_MONTH_RE, "Select a valid start month."),
    endDate: z
      .string({ message: "Select an end month or mark as Present." })
      .trim()
      .refine((v) => v === "Present" || WORK_MONTH_RE.test(v), "Select a valid end month."),
    description: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(CAREERS_APPLY_LIMITS.workDescriptionMax).optional(),
    ),
  })
  .refine((d) => d.startDate <= currentMonthIST(), {
    path: ["startDate"],
    message: "Start month can't be in the future.",
  })
  .refine((d) => d.endDate === "Present" || d.endDate <= currentMonthIST(), {
    path: ["endDate"],
    message: "End month can't be in the future.",
  })
  .refine((d) => d.endDate === "Present" || d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "End month must be on or after the start month.",
  });

const customLinkSchema = z.object({
  label: cleanRequiredName("Link label", 100, 1),
  url: z
    .string()
    .trim()
    .max(CAREERS_APPLY_LIMITS.urlMax)
    .refine((v) => /^https?:\/\/.+/i.test(v), "Link must be a valid http(s) URL."),
});

export const careersApplySchema = z
  .object({
    jobPostingId: z.number().int().positive(),
    name: personNameSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(CAREERS_APPLY_LIMITS.emailMax, `Email must be at most ${CAREERS_APPLY_LIMITS.emailMax} characters.`),
    phone: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(CAREERS_APPLY_LIMITS.phoneMax)
        .refine(isValidPhone, "Enter a valid phone number (8–15 digits).")
        .optional(),
    ),
    location: z.preprocess(
      emptyToUndefined,
      cleanOptionalStrictName("Location", { max: CAREERS_APPLY_LIMITS.locationMax }).optional(),
    ),
    linkedinUrl: optionalUrl(LINKEDIN_URL_RE, "Enter a valid LinkedIn profile URL."),
    githubUrl: optionalUrl(GITHUB_URL_RE, "Enter a valid GitHub profile URL."),
    currentRole: z.preprocess(
      emptyToUndefined,
      cleanOptionalStrictName("Current job title", { max: CAREERS_APPLY_LIMITS.currentRoleMax }).optional(),
    ),
    experienceYears: z.coerce
      .number({ message: "Enter your total years of experience." })
      .min(0, "Years of experience cannot be negative.")
      .max(
        CAREERS_APPLY_LIMITS.experienceYearsMax,
        `Years of experience cannot exceed ${CAREERS_APPLY_LIMITS.experienceYearsMax}.`,
      ),
    skills: z
      .array(skillItemSchema)
      .max(CAREERS_APPLY_LIMITS.maxSkills, `You can add up to ${CAREERS_APPLY_LIMITS.maxSkills} skills.`)
      .optional(),
    education: z
      .array(educationSchema)
      .max(CAREERS_APPLY_LIMITS.maxEducation)
      .optional(),
    workExperience: z
      .array(workExperienceSchema)
      .max(CAREERS_APPLY_LIMITS.maxWorkExperience)
      .optional(),
    customLinks: z
      .array(customLinkSchema)
      .max(CAREERS_APPLY_LIMITS.maxCustomLinks, `You can add up to ${CAREERS_APPLY_LIMITS.maxCustomLinks} links.`)
      .optional(),
    coverLetter: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(CAREERS_APPLY_LIMITS.coverLetterMax).optional(),
    ),
    resumeUrl: z
      .string()
      .trim()
      .min(1, "A résumé is required to apply.")
      .refine(isValidResumeReference, "Invalid resume reference."),
  })
  .superRefine((data, ctx) => {
    if (!data.skills?.length) return;
    const seen = new Set<string>();
    for (let i = 0; i < data.skills.length; i++) {
      const key = data.skills[i].toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["skills", i],
          message: "Duplicate skill.",
        });
      }
      seen.add(key);
    }
  });

export type CareersApplyInput = z.infer<typeof careersApplySchema>;

export function mapApplyErrors(issues: z.ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const rawKey = issue.path.join(".");
    const key = rawKey === "resumeUrl" ? "resume" : rawKey;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function sanitizeSkillInput(value: string): string {
  return value.replace(/[^A-Za-z0-9+#.\-\s]/g, "");
}

export function sanitizePersonNameInput(value: string): string {
  return value.replace(/[^\p{L}\s.'-]/gu, "");
}

export function sanitizeLocationInput(value: string): string {
  return value.replace(/[^\p{L}\p{N} \-&/.,'()]/gu, "");
}

export function sanitizeJobTitleInput(value: string): string {
  return value.replace(/[^\p{L}\p{N} \-&/.,'()]/gu, "");
}

export function sanitizeLabelInput(value: string): string {
  return value.replace(/[^\p{L}\p{N} \-–—&/().,'’:+]/gu, "");
}

/** Parse comma-separated skills; drops empty tokens from trailing commas. */
export function parseSkillsList(raw: string, extra: string[] = []): string[] {
  const items = [
    ...raw.split(",").map((s) => sanitizeSkillInput(s.trim())),
    ...extra.map((s) => sanitizeSkillInput(s.trim())),
  ].filter((s) => s.length > 0);
  return [...new Set(items)];
}
