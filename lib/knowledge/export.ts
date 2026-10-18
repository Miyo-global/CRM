/**
 * KB-0063: serialising pages out.
 *
 * Markdown is the default because it is the format a page can come back in
 * through the importer; HTML is for reading. A one-page export streams straight
 * back even without R2, so an org with no storage configured can still get its
 * content out — losing the ability to leave is not an acceptable degradation.
 *
 * Streamline: SB/modules/kb/wiki/kb-export.service.ts, kb-export-serializer.ts.
 */
import "server-only";

import {
  plateToHtml,
  plateToMarkdown,
  type PlateValue,
} from "@/components/editor/plate/plate-value-convert";

export type KbExportFormat = "markdown" | "html";

/** Safe for a zip entry and for a Content-Disposition header. */
export function exportFileName(title: string, format: KbExportFormat): string {
  const base =
    title
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "Untitled";
  return `${base}.${format === "markdown" ? "md" : "html"}`;
}

export function serializePage(
  page: { title: string; content: unknown; updatedAt?: Date | null },
  format: KbExportFormat,
): string {
  const value = (Array.isArray(page.content) ? page.content : []) as PlateValue;

  if (format === "markdown") {
    const body = plateToMarkdown(value);
    // The title is a heading rather than front matter, so a round trip through
    // the importer keeps it.
    return `# ${page.title || "Untitled"}\n\n${body}\n`;
  }

  const body = plateToHtml(value);
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(page.title || "Untitled")}</title>`,
    "</head>",
    "<body>",
    `<h1>${escapeHtml(page.title || "Untitled")}</h1>`,
    body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportContentType(format: KbExportFormat): string {
  return format === "markdown" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";
}

/** How long a stored export stays downloadable. */
export const EXPORT_TTL_HOURS = 24;

export function exportExpiry(from = new Date()): Date {
  return new Date(from.getTime() + EXPORT_TTL_HOURS * 60 * 60 * 1000);
}
