import { z } from "zod";

export const DOCUMENT_DESCRIPTION_MAX = 500;
export const DOCUMENT_NAME_MAX = 255;
export const DOCUMENT_CATEGORY_MAX = 200;
export const RICH_DOCUMENT_TITLE_MAX = 200;
export const DOCUMENT_FOLDER_NAME_MAX = 50;

const TITLE_ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N}\s\-_().&',/]*$/u;

export const richDocumentTitleSchema = z
  .string()
  .trim()
  .min(2, "Title must be at least 2 characters")
  .max(RICH_DOCUMENT_TITLE_MAX, "Title cannot exceed 200 characters")
  .refine((v) => /\p{L}|\p{N}/u.test(v), "Title must contain at least one letter or number")
  .refine((v) => !/^[^\p{L}\p{N}]+$/u.test(v), "Title cannot be only special characters")
  .refine((v) => !/\s{2,}/.test(v), "Title cannot have consecutive spaces")
  .refine((v) => TITLE_ALLOWED.test(v), "Title contains invalid characters")
  .transform((v) => v.replace(/\s+/g, " ").trim());

export const documentNameSchema = richDocumentTitleSchema;

export const documentFolderNameSchema = z
  .string()
  .trim()
  .min(2, "Folder name must be at least 2 characters")
  .max(DOCUMENT_FOLDER_NAME_MAX, `Folder name must be at most ${DOCUMENT_FOLDER_NAME_MAX} characters`)
  .refine((v) => /\p{L}|\p{N}/u.test(v), "Folder name must contain at least one letter or number")
  .refine((v) => !/\s{2,}/.test(v), "Folder name cannot have consecutive spaces")
  .refine((v) => /^[\p{L}\p{N}\s\-_().&']+$/u.test(v), "Folder name contains invalid characters")
  .transform((v) => v.replace(/\s+/g, " ").trim());

export const orgDocumentVariableSlugSchema = z
  .string()
  .trim()
  .min(1, "Token name is required")
  .max(64, "Token name must be at most 64 characters")
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Token name must start with a letter and contain only letters, numbers, and underscores")
  .refine((v) => !/_{2,}/.test(v), "Token name cannot contain consecutive underscores");

export const createDocumentBodySchema = z.object({
  name: documentNameSchema,
  type: z.enum([
    "CONTRACT",
    "CERTIFICATE",
    "ID_PROOF",
    "PAYSLIP",
    "POLICY",
    "OFFER_LETTER",
    "RESUME",
    "OTHER",
  ]),
  fileUrl: z
    .string()
    .min(1)
    .refine(
      (val) => val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
      { message: "Must be a valid URL or a relative path starting with /" },
    ),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  userId: z.string().optional(),
  description: z.string().max(DOCUMENT_DESCRIPTION_MAX).optional(),
  category: z.string().trim().min(1, "Folder is required").max(DOCUMENT_CATEGORY_MAX),
  isPublic: z.boolean().optional().default(false),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format")
    .optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const createDocumentFolderSchema = z.object({
  name: documentFolderNameSchema,
});

export const orgDocumentVariableSchema = z.object({
  slug: orgDocumentVariableSlugSchema,
  label: z.string().trim().min(1).max(120),
  defaultValue: z.string().max(500).default(""),
});

export const updateOrgDocumentVariableSchema = orgDocumentVariableSchema.partial();
