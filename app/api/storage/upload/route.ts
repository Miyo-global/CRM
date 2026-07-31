import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { uploadFile, isStorageConfigured } from "../../../../lib/storage";
import { logger } from "../../../../lib/logger";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_FILE_SIZE_BYTES,
} from "@/lib/files/expense-file-validation";
import {
  DOCUMENT_UPLOAD_MIME_TYPES,
  DOCUMENT_UPLOAD_MAX_BYTES,
  LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES,
} from "@/lib/validations/files";
import { validateMagicBytes } from "@/lib/files/magic-bytes";

const AVATAR_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "File storage is not available" },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const rawFolder = (formData.get("folder") as string) || "uploads";
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "-");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxBytes =
      folder === "receipts"
        ? RECEIPT_MAX_FILE_SIZE_BYTES
        : folder === "avatars"
          ? AVATAR_MAX_FILE_SIZE_BYTES
          : DOCUMENT_UPLOAD_MAX_BYTES;

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    const documentFolders = new Set(["documents", "onboarding", "helpdesk", "uploads"]);
    const imageOnlyFolders = new Set(["ticket-comments"]);
    const allowedTypes =
      folder === "receipts"
        ? [...RECEIPT_ALLOWED_MIME_TYPES]
        : folder === "leave-attachments"
          ? [...LEAVE_ATTACHMENT_ALLOWED_MIME_TYPES]
        : folder === "avatars"
          ? [...AVATAR_ALLOWED_MIME_TYPES]
          : imageOnlyFolders.has(folder)
            ? [...DOCUMENT_UPLOAD_MIME_TYPES]
          : documentFolders.has(folder)
            ? [...DOCUMENT_UPLOAD_MIME_TYPES]
            : [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    const result = await uploadFile(file, folder, undefined, undefined, member.orgId);

    const { createAuditLog } = await import("../../../../lib/audit-log");
    createAuditLog({
      action: "file.upload",
      userId: session.user.id,
      metadata: { fileKey: result.key, fileSize: result.size, mimeType: result.mimeType },
    }).catch((err) => {
      logger.error("Failed to create audit log for file upload", { error: err instanceof Error ? err.message : "Unknown" });
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("File upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
