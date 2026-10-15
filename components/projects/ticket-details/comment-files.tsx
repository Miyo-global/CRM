import { FileText, FileSpreadsheet, File } from "lucide-react";
import type { CommentImage } from "@/types/projects";

export const COMMENT_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function resolveAttachmentUrl(att: CommentImage): string {
  const key = att.key || (att.url.startsWith("http") ? (() => { try { return new URL(att.url).pathname.replace(/^\//, ""); } catch { return att.url; } })() : att.url);
  if (!key) return att.url;
  if (att.mimeType && !att.mimeType.startsWith("image/")) {
    return `/api/storage/download?key=${encodeURIComponent(key)}&attachment=1`;
  }
  return `/api/storage/image?key=${encodeURIComponent(key)}`;
}

export async function uploadCommentFile(file: File): Promise<CommentImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "ticket-comments");
  const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload failed");
  }
  const data = await res.json();
  return { url: data.url, key: data.key, fileName: file.name, mimeType: file.type };
}

export function isImageMime(mimeType?: string, fileName?: string) {
  if (mimeType) return mimeType.startsWith("image/");
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp";
}

export function AttachmentIcon({ mimeType, className }: { mimeType?: string; className?: string }) {
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return <FileSpreadsheet className={className} />;
  if (mimeType?.includes("pdf") || mimeType?.includes("word") || mimeType?.includes("document")) return <FileText className={className} />;
  return <File className={className} />;
}
