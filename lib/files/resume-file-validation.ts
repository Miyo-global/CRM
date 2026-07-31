export const RESUME_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const RESUME_ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const RESUME_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const RESUME_FILE_HINT = "PDF or Word (.doc, .docx)";

const RESUME_SIGNATURES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
};

function fileHasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return RESUME_ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export function validateResumeFileClient(file: File): string | null {
  const isAllowedMime = (RESUME_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  const isAllowedExtension = fileHasAllowedExtension(file.name);

  if (!isAllowedMime || !isAllowedExtension) {
    return `Only ${RESUME_FILE_HINT} files are allowed.`;
  }

  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    return `Resume must be under ${Math.floor(RESUME_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`;
  }

  return null;
}

export function validateResumeFileBuffer(buffer: Buffer, mimeType: string): boolean {
  const signatures = RESUME_SIGNATURES[mimeType];
  if (!signatures) return false;
  if (buffer.length < 4) return false;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}
