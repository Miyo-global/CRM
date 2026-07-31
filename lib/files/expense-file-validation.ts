export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const RECEIPT_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif",
  ".heic",
  ".heif",
  ".pdf",
] as const;

export const RECEIPT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const RECEIPT_FORMAT_LABEL_ORDER = [
  "JPEG",
  "PNG",
  "GIF",
  "WebP",
  "BMP",
  "TIFF",
  "AVIF",
  "HEIC",
  "HEIF",
  "PDF",
] as const;

const EXTENSION_DISPLAY: Record<(typeof RECEIPT_ALLOWED_EXTENSIONS)[number], string> = {
  ".jpg": "JPEG",
  ".jpeg": "JPEG",
  ".png": "PNG",
  ".gif": "GIF",
  ".webp": "WebP",
  ".bmp": "BMP",
  ".tif": "TIFF",
  ".tiff": "TIFF",
  ".avif": "AVIF",
  ".heic": "HEIC",
  ".heif": "HEIF",
  ".pdf": "PDF",
};

function buildReceiptUploadFormatHint(): string {
  const labels = new Set<string>();
  for (const ext of RECEIPT_ALLOWED_EXTENSIONS) {
    labels.add(EXTENSION_DISPLAY[ext]);
  }
  const ordered = RECEIPT_FORMAT_LABEL_ORDER.filter((l) => labels.has(l));
  const maxMb = Math.floor(RECEIPT_MAX_FILE_SIZE_BYTES / (1024 * 1024));
  return `${ordered.join(", ")} up to ${maxMb}MB`;
}

/** Copy for receipt dropzones — keep in sync with RECEIPT_ALLOWED_* and upload route validation. */
export const RECEIPT_UPLOAD_FORMAT_HINT = buildReceiptUploadFormatHint();

export const IMPORT_ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const IMPORT_ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"] as const;

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function fileHasAllowedExtension(fileName: string, allowedExtensions: readonly string[]): boolean {
  const lowerName = fileName.toLowerCase();
  return allowedExtensions.some((ext) => lowerName.endsWith(ext));
}

export function validateFileTypeAndSize(options: {
  file: File;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  maxSizeBytes: number;
}): string | null {
  const { file, allowedMimeTypes, allowedExtensions, maxSizeBytes } = options;
  const isAllowedExtension = fileHasAllowedExtension(file.name, allowedExtensions);
  const mimeUnknown = !file.type || file.type === "application/octet-stream";
  const isAllowedMime = mimeUnknown ? true : allowedMimeTypes.includes(file.type);

  if (!isAllowedExtension || !isAllowedMime) {
    return "File type not supported";
  }

  if (file.size > maxSizeBytes) {
    return `File is too large (max ${Math.floor(maxSizeBytes / (1024 * 1024))}MB)`;
  }

  return null;
}
