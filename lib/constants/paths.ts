import path from "node:path";

/**
 * Centralised filesystem paths.
 *
 * Server-only — imports `node:path` and reads `process.cwd()`, so never pull
 * this into a client component. Replaces `path.join(process.cwd(), ...)`
 * repeated across the document generators, payroll scripts and file handlers.
 */

const APP_ROOT = process.cwd();

/** Static assets served by Next.js from `/`. */
export const PUBLIC_DIR = path.join(APP_ROOT, "public");

/** Branded logo assets used by the PDF and HTML document generators. */
export const LOGO_PNG_PATH = path.join(PUBLIC_DIR, "logo.png");
export const LOGO_SVG_PATH = path.join(PUBLIC_DIR, "logo.svg");
export const LOGO_WORDMARK_PATH = path.join(PUBLIC_DIR, "logo-wordmark.png");

/**
 * Payroll and document output root. Override with GENERATED_OUTPUT_DIR when the
 * app runs on a read-only filesystem and needs a writable volume instead.
 */
export const GENERATED_DIR = process.env.GENERATED_OUTPUT_DIR
  ? path.resolve(process.env.GENERATED_OUTPUT_DIR)
  : path.join(APP_ROOT, "generated");

export const PAYSLIP_OUTPUT_DIR = path.join(GENERATED_DIR, "payslips");

/** Drizzle migration files, read by the migration scripts. */
export const DRIZZLE_DIR = path.join(APP_ROOT, "drizzle");

/**
 * Resolve a public-relative URL (e.g. `/uploads/doc.pdf`) to an absolute path,
 * refusing anything that escapes PUBLIC_DIR.
 *
 * Stored file URLs reach this from the database, so a value like
 * `/../../.env` must not resolve to a real file. Returns null when the input
 * is empty or traverses outside the public directory.
 */
export function resolvePublicPath(relativeUrl: string): string | null {
  const trimmed = relativeUrl.replace(/^\/+/, "").trim();
  if (!trimmed) return null;

  const resolved = path.resolve(PUBLIC_DIR, trimmed);
  const root = path.resolve(PUBLIC_DIR);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}
