import { getFileKeyFromUrl, isPrivateStorageUrl } from "@/lib/files/storage-url";

/** Same-origin URL suitable for embedding résumés in an iframe. */
export function getResumePreviewSrc(resumeUrl: string): string {
  const trimmed = resumeUrl.trim();
  if (!trimmed) return trimmed;

  if (isPrivateStorageUrl(trimmed) || !trimmed.startsWith("http")) {
    const key = getFileKeyFromUrl(trimmed);
    if (trimmed.startsWith("http")) {
      return `/api/storage/download?url=${encodeURIComponent(trimmed)}&inline=1`;
    }
    return `/api/storage/download?key=${encodeURIComponent(key)}&inline=1`;
  }

  return trimmed;
}

export function getResumeOpenSrc(resumeUrl: string): string {
  const trimmed = resumeUrl.trim();
  if (!trimmed) return trimmed;
  if (isPrivateStorageUrl(trimmed) || !trimmed.startsWith("http")) {
    return getResumePreviewSrc(trimmed);
  }
  return trimmed;
}

export function isResumePdf(resumeUrl: string): boolean {
  const key = getFileKeyFromUrl(resumeUrl);
  return /\.pdf(\?|#|$)/i.test(resumeUrl) || /\.pdf$/i.test(key);
}
