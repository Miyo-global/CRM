import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { getFileStream, isStorageConfigured, getOrgIdFromKey } from "../../../../lib/storage";
import { db } from "../../../../lib/db";
import {
  organizationMembers,
  documents,
  chatAttachments,
  chatMessages,
  chatChannels,
  candidateDocumentsVault,
} from "../../../../lib/db/schema";
import { eq, or, and } from "drizzle-orm";

async function fileBelongsToOrg(fileKey: string, orgId: string): Promise<boolean> {
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const fileUrlCandidates = publicBase
    ? [fileKey, `${publicBase}/${fileKey}`]
    : [fileKey];

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.orgId, orgId),
      or(...fileUrlCandidates.map((u) => eq(documents.fileUrl, u)))
    ),
    columns: { id: true },
  });
  if (doc) return true;

  const chatRows = await db
    .select({ id: chatAttachments.id })
    .from(chatAttachments)
    .innerJoin(chatMessages, eq(chatAttachments.messageId, chatMessages.id))
    .innerJoin(chatChannels, eq(chatMessages.channelId, chatChannels.id))
    .where(and(eq(chatAttachments.fileKey, fileKey), eq(chatChannels.orgId, orgId)))
    .limit(1);
  if (chatRows.length > 0) return true;

  const vault = await db.query.candidateDocumentsVault.findFirst({
    where: and(
      eq(candidateDocumentsVault.s3Key, fileKey),
      eq(candidateDocumentsVault.orgId, orgId)
    ),
    columns: { id: true },
  });
  if (vault) return true;

  return false;
}
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function isValidFileKey(key: string): boolean {
  if (key.includes("..") || key.includes("\\") || key.startsWith("/")) return false;
  if (key.includes("\0")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key || !isValidFileKey(key)) {
      return NextResponse.json({ error: "Invalid key parameter" }, { status: 400 });
    }

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: "Storage not available" }, { status: 503 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const keyOrg = getOrgIdFromKey(key);
    if (keyOrg) {
      if (keyOrg !== member.orgId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else {
      const belongs = await fileBelongsToOrg(key, member.orgId);
      if (!belongs) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const { body, contentType } = await getFileStream(key);
    const webStream = Readable.toWeb(body) as ReadableStream;
    const SAFE_IMAGE_TYPES = new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/avif",
    ]);
    const rawType = contentType ?? getMimeType(key);
    const safeType = SAFE_IMAGE_TYPES.has(rawType) ? rawType : "application/octet-stream";
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": safeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    logger.error("Image proxy error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
