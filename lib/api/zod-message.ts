import { z } from "zod";

/**
 * The one Zod error map (QA-D005, R3-ONB-01).
 *
 * Zod's own wording ("Invalid input: expected number, received NaN", "Too
 * small: expected string to have >=2 characters") must never reach a reader.
 * A message written in a schema always wins; anything left to Zod is worded
 * here as "<Label> is required", "<Label> must be at most 50 characters", ...
 *
 * Importing this module installs the map globally (z.config). It is imported
 * by lib/api/helpers (every API route) and by the client QueryProvider (every
 * react-hook-form resolver).
 */

function humanize(key: string): string {
  const spaced = key
    .replace(/Id$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function fieldLabel(path: readonly PropertyKey[] | undefined): string | null {
  const named = (path ?? []).filter((p) => typeof p === "string") as string[];
  if (named.length === 0) return null;
  return humanize(named[named.length - 1]) || null;
}

function isBlank(input: unknown): boolean {
  return input === undefined || input === null || (typeof input === "string" && input.trim() === "");
}

/** Message for an issue the schema did not word itself. */
export function defaultIssueMessage(issue: z.core.$ZodRawIssue | z.core.$ZodIssue): string {
  const label = fieldLabel(issue.path) ?? "This field";
  const i = issue as {
    code: string;
    input?: unknown;
    expected?: string;
    origin?: string;
    minimum?: number | bigint;
    maximum?: number | bigint;
    inclusive?: boolean;
    format?: string;
  };
  switch (i.code) {
    case "invalid_type":
      if (isBlank(i.input)) return `${label} is required`;
      if (i.expected === "number" || i.expected === "int") return `${label} must be a number`;
      if (i.expected === "date") return `${label} must be a valid date`;
      return `${label} is not valid`;
    case "too_small":
      if (i.origin === "string") {
        return Number(i.minimum) <= 1 ? `${label} is required` : `${label} must be at least ${i.minimum} characters`;
      }
      if (i.origin === "array" || i.origin === "set") return `Choose at least ${i.minimum} for ${label.toLowerCase()}`;
      if (Number(i.minimum) === 0 && i.inclusive === false) return `${label} must be greater than 0`;
      return `${label} must be at least ${i.minimum}`;
    case "too_big":
      if (i.origin === "string") return `${label} must be at most ${i.maximum} characters`;
      if (i.origin === "array" || i.origin === "set") return `Choose at most ${i.maximum} for ${label.toLowerCase()}`;
      return `${label} cannot exceed ${i.maximum}`;
    case "invalid_format":
      if (i.format === "email") return "Enter a valid email address";
      if (i.format === "url") return "Enter a valid URL";
      return `${label} is not in the expected format`;
    case "invalid_value":
      return `Choose one of the listed options for ${label.toLowerCase()}`;
    case "not_multiple_of":
      return `${label} must be a whole number`;
    default:
      return `${label} is not valid`;
  }
}

z.config({ customError: (issue) => defaultIssueMessage(issue) });

/** Zod's own wording, which should never reach a reader. */
const MACHINE_WORDING = /expected|received|too small|too big|invalid input|nan\b/i;

function issueMessage(issue: z.core.$ZodIssue): string {
  return issue.message && !MACHINE_WORDING.test(issue.message) ? issue.message : defaultIssueMessage(issue);
}

/** "<Field>: message", unless the message already names the field. */
function withField(issue: z.core.$ZodIssue): string {
  const message = issueMessage(issue);
  const field = fieldLabel(issue.path);
  if (!field || message.toLowerCase().startsWith(field.toLowerCase())) return message;
  return `${field}: ${message}`;
}

/** A Zod error as one sentence a user can act on. */
export function zodErrorMessage(error: z.ZodError): string {
  const first = error.issues[0];
  return first ? withField(first) : "Some details are missing or invalid.";
}

/**
 * The API's 400 body: `{ error, fields: { "bankDetails.ifsc": "..." } }`.
 * `error` is the first problem as a sentence; `fields` has one message per
 * field so a form can mark each one.
 */
export function formatZodError(error: z.ZodError): { error: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key && !(key in fields)) fields[key] = issueMessage(issue);
  }
  return { error: zodErrorMessage(error), fields };
}
