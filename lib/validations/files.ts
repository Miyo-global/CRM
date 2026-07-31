import {
  RECEIPT_ALLOWED_EXTENSIONS,
  RECEIPT_ALLOWED_MIME_TYPES,
} from "@/lib/files/expense-file-validation";

export {
  validateFileTypeAndSize,
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_ALLOWED_EXTENSIONS,
  RECEIPT_UPLOAD_FORMAT_HINT,
  RECEIPT_MAX_FILE_SIZE_BYTES,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_MAX_FILE_SIZE_BYTES,
} from "@/lib/files/expense-file-validation";

export {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_NAME_MAX,
} from "@/lib/validations/hr-documents";

export const DOCUMENT_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const DOCUMENT_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
] as const;

export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Leave request attachments: PDF, DOCX, and common image formats only. */
export const LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ...RECEIPT_ALLOWED_MIME_TYPES,
] as const;

export const LEAVE_ATTACHMENT_ALLOWED_EXTENSIONS = [
  ".docx",
  ...RECEIPT_ALLOWED_EXTENSIONS,
] as const;

export const LEAVE_ATTACHMENT_ACCEPT = "image/*,.pdf,.docx";

export const LEAVE_ATTACHMENT_UPLOAD_FORMAT_HINT =
  "PDF, DOCX, or image files (JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF, HEIC)";
