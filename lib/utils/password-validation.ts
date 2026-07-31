import { z } from "zod";

export const PASSWORD_RULES = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: "@$!%*?&",
} as const;

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
  if (!/[@$!%*?&]/.test(password)) {
    missing.push("At least one special character (@$!%*?&)");
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
