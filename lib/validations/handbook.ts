import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const handbookVersionSchema = z.object({
  version: z
    .string()
    .trim()
    .min(3, "Version must be at least 3 characters (e.g. 1.0)")
    .max(20, "Version must be at most 20 characters")
    .regex(
      /^[0-9]+(\.[0-9]+){1,4}$/,
      "Version must use numeric segments separated by dots (e.g. 1.0, 2.1.3) — single numbers not allowed",
    ),
  title: trimmed(5, 120, "Title")
    .refine(
      (v) => /^[A-Za-z0-9]/.test(v),
      "Title must start with a letter or number",
    )
    .refine(
      (v) => !/\s{2,}/.test(v),
      "Title cannot contain consecutive spaces",
    )
    .refine(
      (v) => /[A-Za-z0-9]{2,}/.test(v),
      "Title must contain at least two consecutive letters or numbers",
    )
    .refine(
      (v) => /^[A-Za-z0-9\s\-'.&,()/:@#]+$/.test(v),
      "Title can only contain letters, numbers, spaces, and common punctuation (- . ' & , ( ) / : @ #)",
    ),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  documentUrl: z
    .string()
    .trim()
    .max(2048, "Document URL is too long")
    .url("Enter a valid URL (https://...)")
    .optional()
    .or(z.literal("")),
});

export const handbookUpdateSchema = handbookVersionSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type HandbookVersionInput = z.infer<typeof handbookVersionSchema>;
export type HandbookUpdateInput = z.infer<typeof handbookUpdateSchema>;
