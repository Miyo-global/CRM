import { z } from "zod";

const TITLE_CHAR_RE = /[A-Za-z0-9 \-'&/,.]/;

export const CAREER_LADDER_TITLE_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9 \-'&/,.]*[A-Za-z0-9])?$/;

export function filterCareerLadderTitleInput(value: string): string {
  return value
    .split("")
    .filter((ch) => TITLE_CHAR_RE.test(ch))
    .join("")
    .replace(/\s{2,}/g, " ");
}

export function getCareerLadderTitleError(title: string): string | null {
  const t = title.trim();
  if (!t) return "Title is required";
  if (t.length < 2) return "Title must be at least 2 characters";
  if (t.length > 120) return "Title must be 120 characters or less";
  if (/\s{2,}/.test(t)) return "Title cannot contain consecutive spaces";
  if (!CAREER_LADDER_TITLE_PATTERN.test(t)) {
    return "Use only letters, numbers, spaces, and - ' . & / ,";
  }
  if (!/\p{L}/u.test(t)) return "Title must contain at least one letter";
  return null;
}

export const careerLadderTitleSchema = z
  .string()
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(120, "Title must be 120 characters or less")
  .refine((v) => !/\s{2,}/.test(v), "Title cannot contain consecutive spaces")
  .refine(
    (v) => CAREER_LADDER_TITLE_PATTERN.test(v),
    "Use only letters, numbers, spaces, and - ' . & / ,",
  )
  .refine((v) => /\p{L}/u.test(v), "Title must contain at least one letter");

export const careerLadderDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Description must be 500 characters or less");

export const CAREER_LADDER_STATUSES = ["draft", "active", "archived"] as const;
export const CAREER_LADDER_TRACK_TYPES = [
  "individual_contributor",
  "management",
  "technical",
  "specialist",
] as const;
export const CAREER_LADDER_VISIBILITIES = ["all", "department", "admin"] as const;

const levelSchema = z
  .object({
    level: z.number().int().min(1, "Level must be at least 1").max(20, "Level cannot exceed 20"),
    title: careerLadderTitleSchema,
    description: z.string().trim().min(1, "Level description is required").max(1000, "Description must be 1000 characters or less"),
    minExperience: z
      .number()
      .min(0, "Min experience cannot be negative")
      .max(40, "Min experience cannot exceed 40 years"),
    skills: z
      .preprocess((v) => v ?? [], z.array(z.string().trim().min(1).max(100, "Each skill must be 100 characters or less"))
      .max(30, "A level can have at most 30 skills")),
    scope: z.string().trim().max(2000, "Scope must be 2000 characters or less").optional(),
    responsibilities: z
      .preprocess((v) => v ?? [], z.array(z.string().trim().min(1).max(300, "Each responsibility must be 300 characters or less"))
      .max(20, "A level can have at most 20 responsibilities")),
    behaviors: z
      .preprocess((v) => v ?? [], z.array(z.string().trim().min(1).max(300, "Each behavior must be 300 characters or less"))
      .max(20, "A level can have at most 20 behaviors")),
    leadershipExpectations: z.string().trim().max(2000, "Leadership expectations must be 2000 characters or less").optional(),
    promotionCriteria: z.string().trim().max(2000, "Promotion criteria must be 2000 characters or less").optional(),
    salaryBandMin: z.number().min(0, "Salary band min cannot be negative").optional(),
    salaryBandMax: z.number().min(0, "Salary band max cannot be negative").optional(),
    typicalDuration: z.string().trim().max(100, "Typical duration must be 100 characters or less").optional(),
    competencies: z
      .preprocess((v) => v ?? [], z.array(z.string().trim().min(1).max(200, "Each competency must be 200 characters or less"))
      .max(20, "A level can have at most 20 competencies")),
  })
  .superRefine((l, ctx) => {
    if (
      l.salaryBandMin !== undefined &&
      l.salaryBandMax !== undefined &&
      l.salaryBandMin > l.salaryBandMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Salary band min must be less than or equal to max",
        path: ["salaryBandMin"],
      });
    }
  });

function validateLevels(levels: { level: number; minExperience: number }[]): true | string {
  const nums = levels.map((l) => l.level);
  if (new Set(nums).size !== nums.length) return "Level numbers must be unique";
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted[0] !== 1) return "Levels must start from 1";
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1]! + 1) return "Level numbers must be consecutive (no gaps)";
  }
  const byLevel = [...levels].sort((a, b) => a.level - b.level);
  for (let i = 1; i < byLevel.length; i++) {
    if (byLevel[i]!.minExperience < byLevel[i - 1]!.minExperience)
      return "Min experience must increase with each level";
  }
  return true;
}

export const createCareerLadderSchema = z
  .object({
    title: careerLadderTitleSchema,
    department: z.string().trim().max(100, "Department must be 100 characters or less").optional(),
    description: careerLadderDescriptionSchema.optional(),
    status: z.enum(CAREER_LADDER_STATUSES).default("active"),
    trackType: z.enum(CAREER_LADDER_TRACK_TYPES).optional().nullable(),
    visibility: z.enum(CAREER_LADDER_VISIBILITIES).default("all"),
    levels: z.preprocess((v) => v ?? [], z.array(levelSchema).max(20, "A career ladder can have at most 20 levels")),
  })
  .superRefine((d, ctx) => {
    if (!d.levels || d.levels.length === 0) return;
    const result = validateLevels(d.levels);
    if (result !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result,
        path: ["levels"],
      });
    }
  });

export const updateCareerLadderSchema = z
  .object({
    title: careerLadderTitleSchema.optional(),
    department: z.string().trim().max(100).optional().nullable(),
    description: careerLadderDescriptionSchema.optional().nullable(),
    status: z.enum(CAREER_LADDER_STATUSES).optional(),
    trackType: z.enum(CAREER_LADDER_TRACK_TYPES).optional().nullable(),
    visibility: z.enum(CAREER_LADDER_VISIBILITIES).optional(),
    levels: z.preprocess((v) => v ?? [], z.array(levelSchema).max(20, "A career ladder can have at most 20 levels")).optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.levels || d.levels.length === 0) return;
    const result = validateLevels(d.levels);
    if (result !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result,
        path: ["levels"],
      });
    }
  });
