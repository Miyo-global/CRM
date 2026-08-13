"server-only";

import JSZip from "jszip";
import { Readable } from "stream";
import fs from "fs/promises";
import type { Document } from "@/types/hr";
import { resolvePublicPath } from "@/lib/constants/paths";
import { getFileKeyFromUrl, getFileStream, isStorageConfigured } from "@/lib/storage";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function extFromMime(mime: string | null | undefined): string {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf")) return ".pdf";
  if (m.includes("wordprocessingml")) return ".docx";
  if (m.includes("msword")) return ".doc";
  if (m.includes("spreadsheetml")) return ".xlsx";
  if (m.includes("excel")) return ".xls";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg")) return ".jpg";
  if (m.includes("jpg")) return ".jpg";
  return "";
}

export async function fetchDocumentFileBuffer(fileUrl: string): Promise<Buffer | null> {
  if (!fileUrl?.trim()) return null;
  try {
    if (fileUrl.startsWith("/") && !fileUrl.startsWith("//")) {
      // fileUrl comes from the database, so it must not be able to escape
      // the public directory and read arbitrary files into the export zip.
      const fullPath = resolvePublicPath(fileUrl);
      if (!fullPath) return null;
      return await fs.readFile(fullPath);
    }
    if (!isStorageConfigured()) return null;
    const key = getFileKeyFromUrl(fileUrl);
    const { body } = await getFileStream(key);
    return await streamToBuffer(body as Readable);
  } catch {
    return null;
  }
}

export async function buildDocumentsZipBuffer(
  documents: Document[],
  options?: { maxFiles?: number },
): Promise<{ buffer: Buffer; included: number; skipped: number }> {
  const maxFiles = options?.maxFiles ?? 100;
  const slice = documents.slice(0, maxFiles);
  const zip = new JSZip();
  const used = new Map<string, number>();
  let included = 0;
  let skipped = 0;

  for (const doc of slice) {
    const buf = await fetchDocumentFileBuffer(doc.fileUrl);
    if (!buf) {
      skipped += 1;
      continue;
    }
    let base = (doc.fileName || doc.name || `document-${doc.id}`).replace(/[/\\?*:|"<>]/g, "-");
    if (!/[.][a-z0-9]+$/i.test(base)) {
      const ext = extFromMime(doc.mimeType);
      if (ext) base += ext;
    }
    let entryName = base;
    const n = (used.get(entryName) ?? 0) + 1;
    used.set(entryName, n);
    if (n > 1) {
      const dot = base.lastIndexOf(".");
      entryName =
        dot > 0 ? `${base.slice(0, dot)} (${n})${base.slice(dot)}` : `${base} (${n})`;
    }
    zip.file(entryName, buf);
    included += 1;
  }

  if (included === 0) {
    zip.file(
      "README.txt",
      "No document files could be retrieved (storage may be unavailable or paths invalid).\r\n",
    );
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return { buffer, included, skipped };
}
