import { z } from "zod";

const DOC_TYPE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 /&().,'-]*$/;
const DOC_TYPE_ALLOWED_CHAR = /^[A-Za-z0-9 /&().,'-]$/;
const SORT_ORDER_PATTERN = /^\d+(\.\d{1,2})?$/;

export const DOC_TYPE_NAME_HINT =
  "letters, numbers, spaces and / & ( ) . , ' -";

export function documentTypeNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sanitizeDocTypeNameInput(raw: string): string {
  return raw
    .split("")
    .filter((ch) => DOC_TYPE_ALLOWED_CHAR.test(ch))
    .join("")
    .replace(/\s{2,}/g, " ")
    .slice(0, 120);
}

export const docTypeNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name must be at most 120 characters")
  .transform((v) => v.replace(/\s+/g, " "))
  .refine((v) => DOC_TYPE_NAME_PATTERN.test(v), {
    message: `Name can only contain ${DOC_TYPE_NAME_HINT} (e.g. National ID / Aadhaar Card)`,
  });

export const documentTypeFormSchema = z.object({
  name: docTypeNameSchema,
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .optional()
    .refine((v) => !v || !v.trim() || SORT_ORDER_PATTERN.test(v.trim()), {
      message: "Enter a non-negative number with up to 2 decimal places (e.g. 1 or 1.5)",
    }),
  applicableRoles: z.array(z.string()),
});

export type DocumentTypeFormValues = z.infer<typeof documentTypeFormSchema>;
