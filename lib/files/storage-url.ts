/** Parse a stored file reference (raw key or URL) into an R2 object key. */
export function getFileKeyFromUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/^\/+/, "");
  }

  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (publicBase && trimmed.startsWith(`${publicBase}/`)) {
    return trimmed.slice(publicBase.length + 1);
  }

  try {
    const parsed = new URL(trimmed);
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));

    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      const bucket = process.env.R2_BUCKET_NAME;
      if (bucket && path.startsWith(`${bucket}/`)) {
        return path.slice(bucket.length + 1);
      }
      return path;
    }

    if (publicBase) {
      const publicHost = new URL(publicBase).hostname;
      if (parsed.hostname === publicHost) {
        return path;
      }
    }
  } catch {
    // fall through
  }

  return trimmed;
}

/** True when the reference points at private org storage (needs signed/proxy access). */
export function isPrivateStorageUrl(fileUrl: string): boolean {
  if (!fileUrl) return false;
  if (fileUrl.startsWith("/uploads/") || fileUrl.startsWith("/api/")) return false;
  if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) return true;

  if (fileUrl.includes(".r2.cloudflarestorage.com")) return true;

  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (publicBase && fileUrl.startsWith(`${publicBase}/`)) return true;

  return false;
}
