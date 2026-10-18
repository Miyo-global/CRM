import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageAttachments } from "@/lib/db/schema";
import { validateMagicBytes } from "@/lib/files/magic-bytes";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotConfigured, kbNotFound } from "@/lib/knowledge/errors";
import { checkMediaEnvelope, MAX_IMAGE_PIXELS } from "@/lib/knowledge/media";
import { logger } from "@/lib/logger";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

/**
 * KB-0057: upload a file for a page.
 *
 * Three gates, in this order, because each is cheaper than the next: the
 * declared type and size, then the magic bytes (an .exe renamed .png fails
 * here), then for an image the pixel count, since a decompression bomb is
 * small on disk and enormous in memory.
 *
 * Without R2 the editor's upload buttons are hidden; this still answers 503
 * with a code rather than a 500, so a client that tries anyway gets told why.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    if (!isStorageConfigured()) return kbNotConfigured("storage");

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    const pageIdRaw = form?.get("pageId");

    if (!(file instanceof File)) return err("Attach a file.", 400);

    const pageId = Number(pageIdRaw);
    if (!Number.isSafeInteger(pageId) || pageId <= 0) return err("pageId is required.", 400);

    // Uploading is an edit of the page the file lands on.
    const decision = await resolvePageAccess(ctx.actor, pageId, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const envelope = checkMediaEnvelope(file.type, file.size);
    if ("rejection" in envelope) {
      return err(envelope.rejection.message, envelope.rejection.status);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!validateMagicBytes(buffer, file.type)) {
      return err("That file's contents do not match its type.", 400);
    }

    let body: Buffer = buffer;
    if (envelope.rule.kind === "image") {
      try {
        const sharp = (await import("sharp")).default;
        const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS });
        const meta = await image.metadata();
        if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_IMAGE_PIXELS) {
          return err("That image is too large to process.", 400);
        }
        // Re-encoding also strips metadata, which often carries location.
        if (file.type !== "image/gif") {
          body = await image.rotate().toBuffer();
        }
      } catch (error) {
        logger.warn("kb.media.image_probe_failed", { error: String(error) });
        return err("That image could not be read.", 400);
      }
    }

    const uploaded = await uploadFile(
      body,
      `kb/${session.orgId}/${pageId}`,
      file.name,
      file.type,
      session.orgId,
    );

    const [attachment] = await db
      .insert(kbPageAttachments)
      .values({
        orgId: session.orgId,
        pageId,
        fileKey: uploaded.key,
        fileName: file.name.slice(0, 500),
        fileUrl: uploaded.url,
        mimeType: file.type,
        fileSize: body.byteLength,
        // Content hash, so the same file uploaded twice is recognisable.
        sha256: createHash("sha256").update(body).digest("hex"),
        uploadedById: session.user.id,
      })
      .returning();

    return ok(
      {
        id: String(attachment.id),
        fileKey: attachment.fileKey,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        kind: envelope.rule.kind,
      },
      201,
    );
  }, req);
}
