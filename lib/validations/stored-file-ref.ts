import { z } from "zod";

/** A storage key as uploadFile returns it: "o/<orgId>/<folder>/<name>". */
const STORAGE_KEY_PATTERN = /^(?:o\/[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/;

export function isStoredFileRef(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    STORAGE_KEY_PATTERN.test(value)
  );
}

/**
 * Reference to an uploaded file.
 *
 * /api/storage/upload returns the R2 object key when no public bucket URL is
 * configured, and /api/storage/download serves a file by that key. Accepting
 * only a URL or a /-prefixed path rejected every upload in the app — documents,
 * handbook, profile photo, recognition and asset returns (QA-0017).
 */
export const storedFileRefSchema = z
  .string()
  .min(1)
  .refine(isStoredFileRef, {
    message: "Must be an uploaded file, a URL, or a path starting with /",
  });
