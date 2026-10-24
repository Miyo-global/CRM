import { z } from "zod";

export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;

/**
 * One email field for invite forms and APIs (R3-INV-10): a real address with a
 * domain and TLD, at most 254 characters, local part at most 64 (RFC 5321).
 * Trimmed and lower-cased so the identity checks compare like with like.
 */
export const EMAIL_ADDRESS_SCHEMA = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`)
  .refine((v) => v.split("@")[0].length <= EMAIL_LOCAL_PART_MAX_LENGTH, {
    message: `The part before @ must be at most ${EMAIL_LOCAL_PART_MAX_LENGTH} characters`,
  })
  .pipe(z.email("Enter a valid email address"))
  .transform((v) => v.toLowerCase());
