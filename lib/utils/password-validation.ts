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

export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  missing: string[];
} {
  const missing: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    missing.push(`At least ${PASSWORD_RULES.minLength} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    missing.push("At least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    missing.push("At least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    missing.push("At least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    missing.push("At least one special character or space");
  }

  const checks = 5;
  const passed = checks - missing.length;
  const score = Math.round((passed / checks) * 100);

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
