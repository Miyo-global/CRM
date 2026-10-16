import { z } from "zod";

/**
 * A Zod error as a sentence a user can act on.
 *
 * Routes used to return Zod's own wording — "Validation failed: points: Too
 * small: expected number to be >=0", "expected string, received undefined" —
 * straight to the browser (QA-D005). Custom messages written in the schemas
 * are kept as they are; the machine-generated ones are rewritten.
 */
export function zodErrorMessage(error: z.ZodError): string {
  const parts = error.issues.map((issue) => {
    const field = fieldLabel(issue.path);
    const message = humanIssue(issue);
    return field ? `${field}: ${message}` : message;
  });

  // One field at a time reads better than a semicolon-joined list.
  return parts[0] ?? "Some details are missing or invalid.";
}

function fieldLabel(path: PropertyKey[]): string | null {
  const named = path.filter((p) => typeof p === "string") as string[];
  if (named.length === 0) return null;
  const last = named[named.length - 1];
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Zod's own wording, which should never reach a reader. */
const MACHINE_WORDING = /expected|received|too small|too big|invalid|must contain|nan/i;

function humanIssue(issue: z.core.$ZodIssue): string {
  // A message written in the schema is already for the reader, so it wins.
  if (issue.message && !MACHINE_WORDING.test(issue.message)) return issue.message;

  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined ? "This is required." : "This value is not valid.";
    case "too_small": {
      const min = (issue as { minimum?: number | bigint }).minimum;
      if ((issue as { origin?: string }).origin === "string") {
        return min === 1 ? "This is required." : `Use at least ${min} characters.`;
      }
      return `Use ${min} or more.`;
    }
    case "too_big": {
      const max = (issue as { maximum?: number | bigint }).maximum;
      if ((issue as { origin?: string }).origin === "string") {
        return `Use at most ${max} characters.`;
      }
      return `Use ${max} or less.`;
    }
    case "invalid_value":
    case "invalid_format":
      return "This value is not in the expected format.";
    default:
      return "This value is not valid.";
  }
}
