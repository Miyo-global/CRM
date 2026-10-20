import { z } from "zod";

/**
 * The one password policy (MIYO-0093): every form and API imports this.
 * 8–128 characters with upper, lower, a digit and any non-alphanumeric
 * character; there is no symbol whitelist.
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  // Any punctuation or space counts. The old set rejected # _ - and a space,
  // common choices in a passphrase (QA-0067).
  specialChars: "!@#$%^&*()_+-=[]{};:'\",.<>/?\\|`~ and spaces",
} as const;

/** Same rule as validatePasswordStrength, for zod .regex() in forms. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

/** Per-rule results; client checklists and the server read the same tests. */
export function passwordChecks(password: string) {
  return {
    length: password.length >= PASSWORD_RULES.minLength && password.length <= PASSWORD_RULES.maxLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    // Any non-alphanumeric character counts (QA-BUG-03).
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  missing: string[];
} {
  const missing: string[] = [];
  const checks = passwordChecks(password);

  if (password.length < PASSWORD_RULES.minLength) {
    missing.push(`At least ${PASSWORD_RULES.minLength} characters`);
  } else if (!checks.length) {
    missing.push(`At most ${PASSWORD_RULES.maxLength} characters`);
  }
  if (!checks.uppercase) {
    missing.push("At least one uppercase letter");
  }
  if (!checks.lowercase) {
    missing.push("At least one lowercase letter");
  }
  if (!checks.number) {
    missing.push("At least one number");
  }
  if (!checks.special) {
    missing.push("At least one special character or space");
  }

  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / 5) * 100);

  return {
    valid: missing.length === 0,
    score,
    missing,
  };
}

export const PASSWORD_ZOD_SCHEMA = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength, `Password must not exceed ${PASSWORD_RULES.maxLength} characters`)
  .superRefine((val, ctx) => {
    const result = validatePasswordStrength(val);
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.missing[0] ?? "Password does not meet requirements",
      });
    }
  });
