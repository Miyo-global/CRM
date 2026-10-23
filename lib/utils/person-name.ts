/**
 * Name handling: store what was typed (A18).
 *
 * Names keep their own casing ("QA"), their apostrophes and hyphens
 * ("O'Brien-Test"), their full stops ("A. Kumar") and digits ("R2 Emp",
 * R2-LC-01). Only leading whitespace and runs of spaces are tidied. Any other
 * character is rejected by validation with a message naming the allowed set,
 * never dropped while typing (R2-LC-05).
 */
export function normalizePersonNameInput(value: string): string {
  return value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
}

/** Starts with a letter; then letters, digits, spaces, apostrophes, hyphens and full stops. */
export const PERSON_NAME_PATTERN =
  /^[\p{L}\p{M}][\p{L}\p{M}\d'.-]*(?: [\p{L}\p{M}\d'.-]+)*$/u;

export const PERSON_NAME_HINT =
  "letters, numbers, spaces, apostrophes, hyphens and full stops";
