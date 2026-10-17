import { z } from "zod";

/** MIYO-0639: what a candidate sends from the careers site. */
export const applyFieldsSchema = z.object({
  jobId: z.coerce.number().int().positive(),
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z.string().trim().min(6, "Enter a phone number.").max(20),
  linkedinUrl: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
  coverLetter: z.string().trim().max(5000).optional(),
  /** Answers to the job's own questions, keyed by question id. */
  answers: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
  consent: z.literal(true, { message: "Tick the consent box to apply." }),
  /** MIYO-0640: a bot fills this; a person never sees it. */
  website: z.string().max(0).optional(),
});

export type ApplyFields = z.infer<typeof applyFieldsSchema>;

/** The consent wording stored with the record, so it can be shown later. */
export const CONSENT_TEXT_VERSION = "2026-10-17";
export const CONSENT_TEXT =
  "I agree that my application may be stored and shared with the hiring team for this role.";
