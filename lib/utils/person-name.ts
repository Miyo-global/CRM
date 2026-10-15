/**
 * Name handling: store what was typed (A18).
 *
 * Names keep their own casing ("QA"), their apostrophes and hyphens
 * ("O'Brien-Test") and their full stops ("A. Kumar"). Only leading whitespace
 * and runs of spaces are tidied. Digits are rejected with a message rather
 * than silently dropped, so the character filter lets them through to
 * validation.
 */
export function normalizePersonNameInput(value: string): string {
  return value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
}

/** Characters allowed while typing a name: letters, spaces, ' - . and digits. */
export function isPersonNameInputCharValid(value: string): boolean {
  return /^[\p{L}\p{M}\d '.-]*$/u.test(value);
}

/** Letters, spaces, apostrophes, hyphens and full stops — no digits. */
export const PERSON_NAME_PATTERN =
  /^[\p{L}\p{M}][\p{L}\p{M}'.-]*(?: [\p{L}\p{M}'.-]+)*$/u;

export const PERSON_NAME_HINT =
  "letters, spaces, apostrophes, hyphens and full stops";
