import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit-log";
import {
  getFileUrl,
  getFileKeyFromUrl,
  getFileStream,
  getFileNameFromKey,
  isStorageConfigured,
  getOrgIdFromKey,
} from "@/lib/storage";
import { db } from "@/lib/db";
import {
  documents,
  candidateDocumentsVault,
  handbookVersions,
  candidates,
} from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";

async function fileBelongsToOrg(
  fileKey: string,
  orgId: string,
  originalRef?: string,
): Promise<boolean> {
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const fileUrlCandidates = new Set(
    [
      fileKey,
      ...(publicBase ? [`${publicBase}/${fileKey}`] : []),
      ...(originalRef ? [originalRef] : []),
    ].filter(Boolean),
  );

  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.orgId, orgId),
      or(...[...fileUrlCandidates].map((u) => eq(documents.fileUrl, u)))
    ),
    columns: { id: true },
  });
  if (doc) return true;

  const vault = await db.query.candidateDocumentsVault.findFirst({
    where: and(
      eq(candidateDocumentsVault.s3Key, fileKey),
      eq(candidateDocumentsVault.orgId, orgId)
    ),
    columns: { id: true },
  });
  if (vault) return true;

  const handbook = await db.query.handbookVersions.findFirst({
    where: and(
      eq(handbookVersions.orgId, orgId),
      or(...[...fileUrlCandidates].map((u) => eq(handbookVersions.documentUrl, u)))
    ),
    columns: { id: true },
  });
  if (handbook) return true;

  const candidateResume = await db.query.candidates.findFirst({
    where: and(
      eq(candidates.orgId, orgId),
      or(...[...fileUrlCandidates].map((u) => eq(candidates.resumeUrl, u))),
    ),
    columns: { id: true },
  });
  if (candidateResume) return true;

  return false;
}
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function isValidFileKey(fileKey: string): boolean {
  if (fileKey.includes("..") || fileKey.includes("\\") || fileKey.startsWith("/")) return false;
  if (fileKey.includes("\0")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  // withAuth: MFA, deactivation and session-revocation checks (MIYO-0022).
  return withAuth(async (session) => {
    try {
      if (!isStorageConfigured()) {
        return NextResponse.json({ error: "Cloud storage not configured" }, { status: 503 });
      }

      const searchParams = req.nextUrl.searchParams;
      const url = searchParams.get("url");
      const key = searchParams.get("key");
      const rawExpires = parseInt(searchParams.get("expiresIn") || "3600", 10);
      const expiresIn = isNaN(rawExpires) ? 3600 : Math.min(Math.max(rawExpires, 60), 86400);
      const attachment = searchParams.get("attachment") === "1";
      const inline = searchParams.get("inline") === "1";

      if (!url && !key) {
        return NextResponse.json({ error: "URL or key required" }, { status: 400 });
      }

      const fileKey = key || (url ? getFileKeyFromUrl(url) : "");
      const originalRef = url || key || "";
      if (!fileKey || !isValidFileKey(fileKey)) {
        return NextResponse.json({ error: "Invalid file reference" }, { status: 400 });
      }

      const keyOrg = getOrgIdFromKey(fileKey);
      if (keyOrg) {
        if (keyOrg !== session.orgId) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      } else {
        const belongs = await fileBelongsToOrg(fileKey, session.orgId, originalRef);
        if (!belongs) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }

      createAuditLog({
        action: "file.download",
        userId: session.user.id,
        orgId: session.orgId,
        metadata: { fileKey },
      }).catch((err) => {
        logger.error("Failed to create audit log for file download", { error: err instanceof Error ? err.message : "Unknown" });
      });

      if (attachment || inline) {
        const { body, contentType } = await getFileStream(fileKey);
        const filename = getFileNameFromKey(fileKey);
        const webStream = Readable.toWeb(body) as ReadableStream;
        const disposition = attachment ? "attachment" : "inline";
        const headers: Record<string, string> = {
          "Content-Type": contentType ?? getMimeType(fileKey),
          "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "%22")}"`,
          "X-Content-Type-Options": "nosniff",
        };
        if (inline) {
          headers["X-Frame-Options"] = "SAMEORIGIN";
          headers["Content-Security-Policy"] = "frame-ancestors 'self'";
        }
        return new NextResponse(webStream, { headers });
      }

      const signedUrl = await getFileUrl(fileKey, expiresIn);
      return NextResponse.json({ url: signedUrl });
    } catch (error) {
      logger.error("Download error", error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  });
}
