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
  // One specific message per failed rule, in the order a person fixes them
  // (R3-ACC-01): the first entry is what every form and API shows.
  const missing: string[] = [];
  const checks = passwordChecks(password);

  if (password.length < PASSWORD_RULES.minLength) {
    missing.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  } else if (!checks.length) {
    missing.push(`Maximum ${PASSWORD_RULES.maxLength} characters`);
  }
  // A space counts as a symbol, so eight spaces used to fail only on
  // "uppercase" (R3-SET-04).
  if (!/\S/.test(password)) {
    missing.push("Password must contain a non-space character");
  }
  // A leading or trailing space is invisible in the box and easy to lose
  // when the password is pasted elsewhere; it was accepted as "Strong" (FR1-018).
  if (/\S/.test(password) && password !== password.trim()) {
    missing.push("Password can't start or end with a space");
  }
  if (!checks.uppercase) {
    missing.push("Password must contain an uppercase letter");
  }
  if (!checks.lowercase) {
    missing.push("Password must contain a lowercase letter");
  }
  if (!checks.number) {
    missing.push("Password must contain a number");
  }
  if (!checks.special) {
    missing.push("Password must contain a symbol or space");
  }

  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / 5) * 100);

  return {
    valid: missing.length === 0,
    score,
    missing,
  };
}

export type PasswordIdentity = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Full display name; split into words when first/last are not known. */
  name?: string | null;
};

export const PASSWORD_IDENTITY_MESSAGE = "Password must not contain your email or name";

/**
 * R3-SET-01: a password must not contain the account's email, its local part,
 * or the person's first or last name (case-insensitive). Parts shorter than
 * three characters are ignored so "Al" or "jo@x.com" do not block half the
 * alphabet.
 */
export function passwordIdentityIssue(password: string, identity: PasswordIdentity): string | null {
  const email = identity.email?.trim().toLowerCase() ?? "";
  const parts = [
    email,
    email.split("@")[0],
    identity.firstName,
    identity.lastName,
    ...(identity.name ?? "").split(/\s+/),
  ]
    .map((p) => (p ?? "").trim().toLowerCase())
    .filter((p) => p.length >= 3);
  const pw = password.toLowerCase();
  return parts.some((p) => pw.includes(p)) ? PASSWORD_IDENTITY_MESSAGE : null;
}

/** Strength rules plus the identity rule; the first failing rule's message. */
export function passwordIssue(password: string, identity?: PasswordIdentity): string | null {
  return validatePasswordStrength(password).missing[0] ?? (identity ? passwordIdentityIssue(password, identity) : null);
}

/** The shared password field. Pass the identity when the form knows it. */
export function passwordSchema(identity?: PasswordIdentity) {
  return z.string().superRefine((val, ctx) => {
    const message = passwordIssue(val, identity);
    if (message) ctx.addIssue({ code: "custom", message });
  });
}

export const PASSWORD_ZOD_SCHEMA = passwordSchema();
