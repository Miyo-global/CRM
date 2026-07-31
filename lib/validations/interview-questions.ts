import { z } from "zod";

export const INTERVIEW_QUESTION_MIN = 5;
export const INTERVIEW_QUESTION_MAX = 1000;

export const interviewQuestionTextSchema = z
  .string()
  .trim()
  .min(INTERVIEW_QUESTION_MIN, `Question must be at least ${INTERVIEW_QUESTION_MIN} characters`)
  .max(INTERVIEW_QUESTION_MAX, `Question cannot exceed ${INTERVIEW_QUESTION_MAX} characters`)
  .refine((v) => /\p{L}/u.test(v), "Question must contain at least one letter")
  .refine((v) => !/^[^\p{L}\p{N}]+$/u.test(v), "Question cannot be only special characters")
  .refine((v) => !/^\d+$/u.test(v), "Question cannot be numbers only")
  .refine((v) => !/\s{2,}/.test(v), "Question cannot have consecutive spaces")
  .transform((v) => v.replace(/\s+/g, " ").trim());

export function parseInterviewQuestionText(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const parsed = interviewQuestionTextSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid question" };
  }
  return { ok: true, value: parsed.data };
}

export const INTERVIEW_QUESTION_TAG_MIN = 2;
export const INTERVIEW_QUESTION_TAG_MAX = 50;

export const interviewQuestionTagSchema = z
  .string()
  .trim()
  .min(INTERVIEW_QUESTION_TAG_MIN, `Each entry must be at least ${INTERVIEW_QUESTION_TAG_MIN} characters`)
  .max(INTERVIEW_QUESTION_TAG_MAX, `Each entry must be at most ${INTERVIEW_QUESTION_TAG_MAX} characters`)
  .refine((v) => /\p{L}/u.test(v), "Each entry must contain at least one letter")
  .refine(
    (v) => /^[\p{L}\p{N}\s\-]+$/u.test(v),
    "Only letters, numbers, spaces, and hyphens are allowed — no special characters",
  )
  .transform((v) => v.replace(/\s+/g, " ").trim().toLowerCase());

export function parseInterviewQuestionTagsField(
  raw: string,
  label: "Tags" | "Keywords" = "Tags",
): { ok: true; value: string[] } | { ok: false; message: string } {
  const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: true, value: [] };

  const normalized: string[] = [];
  for (const part of parts) {
    const parsed = interviewQuestionTagSchema.safeParse(part);
    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message ?? "Invalid value";
      return { ok: false, message: `${label}: ${detail}` };
    }
    normalized.push(parsed.data);
  }

  if (normalized.length !== new Set(normalized).size) {
    return { ok: false, message: `Duplicate ${label.toLowerCase()} are not allowed` };
  }

  return { ok: true, value: normalized };
}
