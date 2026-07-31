import { z } from "zod";

/**
 * Shared free-text validation rules used across forms (expenses, tickets, etc.).
 *
 * The recurring QA complaints are that free-text fields accept:
 *  - values made up only of special characters / punctuation,
 *  - runs of multiple consecutive spaces,
 *  - arbitrarily long input.
 *
 * These helpers normalise whitespace and require that a value contains at least
 * one letter or digit (i.e. it is not symbols-only).
 */

const MEANINGFUL_CONTENT = /[A-Za-z0-9]/;

/**
 * Allowed characters for short name/label fields (categories, payment methods,
 * etc.): letters, numbers, spaces and a small set of safe punctuation. Rejects
 * symbol soup like "adf _))@*&(@".
 */
const NAME_ALLOWED = /^[\p{L}\p{N} \-–—&/().,'’:+]+$/u;
/** Single-key guard for {@link sanitizeName} / {@link isAllowedName} fields (HR-style inputs). */
const NAME_ALLOWED_CHAR = /^[\p{L}\p{N} \-–—&/().,'’:+]$/u;
export const NAME_ALLOWED_HINT = "letters, numbers, spaces and - + / & ( ) . , ' :";

/**
 * Stricter set for short free-entry inputs (custom category, payment method,
 * merchant): letters, numbers, spaces and only - . ' symbols.
 */
const SIMPLE_NAME_ALLOWED = /^[\p{L}\p{N} \-.']+$/u;
const SIMPLE_NAME_CHAR = /^[\p{L}\p{N} \-.']$/u;
export const SIMPLE_NAME_ALLOWED_HINT = "letters, numbers, spaces and - . '";

/** True when the string contains at least one letter or digit. */
export function hasMeaningfulContent(v: string): boolean {
  return MEANINGFUL_CONTENT.test(v);
}

/** True when the string only contains allowed name/label characters. */
export function isAllowedName(v: string): boolean {
  return NAME_ALLOWED.test(v);
}

/** True when a single typed character belongs to the {@link NAME_ALLOWED} set. */
export function isAllowedNameChar(ch: string): boolean {
  return ch.length === 1 && NAME_ALLOWED_CHAR.test(ch);
}

/** True when the string only contains letters, numbers, spaces and - . ' */
export function isSimpleName(v: string): boolean {
  return SIMPLE_NAME_ALLOWED.test(v);
}

/** True when a single typed character is allowed in a simple-name field. */
export function isSimpleNameChar(ch: string): boolean {
  return SIMPLE_NAME_CHAR.test(ch);
}

/** Strip any character that isn't a letter, number, space, - . or '. */
export function sanitizeSimpleName(v: string): string {
  return v.replace(/[^\p{L}\p{N} \-.']/gu, "");
}

/** Strip any character that isn't allowed in a name/label field. */
export function sanitizeName(v: string): string {
  return v.replace(/[^\p{L}\p{N} \-–—&/().,'’:+]/gu, "");
}

/** Collapse internal runs of whitespace to a single space and trim the ends. */
export function collapseSpaces(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

/**
 * A required free-text field: trimmed, length-bounded, whitespace-collapsed,
 * and rejected when it has no letters/numbers (symbols-only).
 */
export function cleanRequiredText(label: string, max = 200, min = 1) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => hasMeaningfulContent(v), `${label} must contain letters or numbers`)
    .transform(collapseSpaces);
}

/**
 * An optional free-text field: same rules as {@link cleanRequiredText} when a
 * non-empty value is present; empty / undefined is allowed.
 */
export function cleanOptionalText(label: string, max = 500) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => v === "" || hasMeaningfulContent(v), `${label} must contain letters or numbers`)
    .transform(collapseSpaces)
    .optional()
    .or(z.literal(""));
}

/**
 * A required short name/label field: trimmed, length-bounded, whitespace-collapsed,
 * must contain letters/numbers, and restricted to the allowed name character set.
 */
export function cleanRequiredName(label: string, max = 60, min = 2) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => hasMeaningfulContent(v), `${label} must contain letters or numbers`)
    .refine((v) => isAllowedName(v), `${label} can only contain ${NAME_ALLOWED_HINT}`)
    .transform(collapseSpaces);
}

/** Optional variant of {@link cleanRequiredName}; empty / undefined is allowed. */
export function cleanOptionalName(label: string, max = 60) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => v === "" || hasMeaningfulContent(v), `${label} must contain letters or numbers`)
    .refine((v) => v === "" || isAllowedName(v), `${label} can only contain ${NAME_ALLOWED_HINT}`)
    .transform(collapseSpaces)
    .optional()
    .or(z.literal(""));
}

/**
 * Strict name set for titles / locations: letters, numbers, spaces and a small
 * set of safe punctuation. Must start with a letter and may not repeat the same
 * character three or more times in a row.
 */
const STRICT_NAME_ALLOWED = /^[\p{L}\p{N} \-&/.,'()]+$/u;
const STRICT_NAME_CHAR = /^[\p{L}\p{N} \-&/.,'()]$/u;
const STARTS_WITH_LETTER = /^\p{L}/u;
const REPEATED_RUN = /(.)\1\1/;
export const STRICT_NAME_HINT = "letters, numbers, spaces and - & / . , ' ( )";

export function isStrictName(v: string): boolean {
  return STRICT_NAME_ALLOWED.test(v);
}

export function isStrictNameChar(ch: string): boolean {
  return STRICT_NAME_CHAR.test(ch);
}

export function startsWithLetter(v: string): boolean {
  return STARTS_WITH_LETTER.test(v);
}

export function hasRepeatedRun(v: string): boolean {
  return REPEATED_RUN.test(v);
}

export function sanitizeStrictName(v: string): string {
  return v.replace(/[^\p{L}\p{N} \-&/.,'()]/gu, "");
}

/**
 * A required title/location field: trimmed, whitespace-collapsed, length-bounded,
 * restricted to the strict name set, must start with a letter, and rejects any
 * character repeated three or more times in a row.
 */
export function cleanStrictName(label: string, { min = 3, max = 150 }: { min?: number; max?: number } = {}) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
        .max(max, `${label} must be at most ${max} characters`)
        .refine((v) => startsWithLetter(v), `${label} must start with a letter`)
        .refine((v) => isStrictName(v), `${label} can only contain ${STRICT_NAME_HINT}`)
        .refine((v) => !hasRepeatedRun(v), `${label} cannot repeat the same character 3 or more times in a row`)
    );
}

/** Optional variant of {@link cleanStrictName}; empty / undefined is allowed. */
export function cleanOptionalStrictName(label: string, { max = 150 }: { max?: number } = {}) {
  return z
    .string()
    .trim()
    .transform(collapseSpaces)
    .pipe(
      z
        .string()
        .max(max, `${label} must be at most ${max} characters`)
        .refine((v) => v === "" || startsWithLetter(v), `${label} must start with a letter`)
        .refine((v) => v === "" || isStrictName(v), `${label} can only contain ${STRICT_NAME_HINT}`)
        .refine((v) => v === "" || !hasRepeatedRun(v), `${label} cannot repeat the same character 3 or more times in a row`)
    )
    .optional()
    .or(z.literal(""));
}

/**
 * Optional short field that only allows letters, numbers, spaces and + - .
 * For "specify / other" inputs that should reject all other punctuation.
 */
export function cleanOptionalSimpleName(label: string, max = 60) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .refine((v) => v === "" || hasMeaningfulContent(v), `${label} must contain letters or numbers`)
    .refine((v) => v === "" || isSimpleName(v), `${label} can only contain ${SIMPLE_NAME_ALLOWED_HINT}`)
    .transform(collapseSpaces)
    .optional()
    .or(z.literal(""));
}

/** One preset office location with structured address fields. */
export const jobOfficeLocationPresetEntrySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be 200 characters or fewer"),
  city: z.string().trim().min(1, "City is required").max(100, "City must be 100 characters or fewer"),
  state: z.string().trim().min(1, "State is required").max(100, "State must be 100 characters or fewer"),
  country: z.string().trim().min(1, "Country is required").max(100, "Country must be 100 characters or fewer"),
});
