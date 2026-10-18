import type { KbImportItem } from "@/lib/api/hooks/knowledge";

/** KB-0062, KB-0088: at most a hundred pages in one import. */
export const IMPORT_MAX_FILES = 100;

/** A single file this big is almost certainly not a wiki page. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ImportSourceType = "markdown" | "html" | "zip";

export interface ReadImportResult {
  items: KbImportItem[];
  /** Files left out, and why — shown rather than silently dropped. */
  skipped: Array<{ name: string; reason: string }>;
  truncated: boolean;
}

function titleFromName(name: string): string {
  const base = name.split("/").pop() ?? name;
  return base.replace(/\.(md|markdown|html?|txt)$/i, "").trim() || "Untitled";
}

export function sourceTypeForFiles(names: string[]): ImportSourceType {
  if (names.some((name) => /\.zip$/i.test(name))) return "zip";
  if (names.every((name) => /\.html?$/i.test(name))) return "html";
  return "markdown";
}

/**
 * Reads the chosen files in the browser.
 *
 * A zip is unpacked here rather than uploaded, which keeps the import endpoint
 * to one shape — a list of titles and bodies — and means a zip full of images
 * never travels at all.
 */
export async function readImportFiles(files: File[]): Promise<ReadImportResult> {
  const items: KbImportItem[] = [];
  const skipped: ReadImportResult["skipped"] = [];

  for (const file of files) {
    if (items.length >= IMPORT_MAX_FILES) break;

    if (/\.zip$/i.test(file.name)) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(
        (entry) => !entry.dir && /\.(md|markdown|html?|txt)$/i.test(entry.name),
      );

      for (const entry of entries) {
        if (items.length >= IMPORT_MAX_FILES) break;
        const text = await entry.async("string");
        if (!text.trim()) {
          skipped.push({ name: entry.name, reason: "Empty" });
          continue;
        }
        items.push({ title: titleFromName(entry.name), contentText: text.slice(0, 50_000) });
      }
      continue;
    }

    if (file.size > MAX_FILE_BYTES) {
      skipped.push({ name: file.name, reason: "Larger than 2 MB" });
      continue;
    }

    const text = await file.text();
    if (!text.trim()) {
      skipped.push({ name: file.name, reason: "Empty" });
      continue;
    }

    items.push({ title: titleFromName(file.name), contentText: text.slice(0, 50_000) });
  }

  return {
    items,
    skipped,
    truncated: files.length > IMPORT_MAX_FILES || items.length >= IMPORT_MAX_FILES,
  };
}
