import type { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageAttachments } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { getFileUrl, isStorageConfigured } from "@/lib/storage";

/** Signed for five minutes: long enough to open, short enough not to forward. */
const ATTACHMENT_URL_TTL_SECONDS = 300;

/** KB-0058: a page's attachments, with short-lived download URLs. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const rows = await db
      .select({
        id: kbPageAttachments.id,
        fileKey: kbPageAttachments.fileKey,
        fileName: kbPageAttachments.fileName,
        mimeType: kbPageAttachments.mimeType,
        fileSize: kbPageAttachments.fileSize,
        createdAt: kbPageAttachments.createdAt,
      })
      .from(kbPageAttachments)
      .where(
        and(
          eq(kbPageAttachments.orgId, session.orgId),
          eq(kbPageAttachments.pageId, id),
          isNull(kbPageAttachments.deletedAt),
        ),
      )
      .orderBy(desc(kbPageAttachments.createdAt))
      .limit(200);

    const signed = isStorageConfigured()
      ? await Promise.all(
          rows.map(async (row) => ({
            ...row,
            id: String(row.id),
            url: await getFileUrl(row.fileKey, ATTACHMENT_URL_TTL_SECONDS).catch(() => null),
          })),
        )
      : rows.map((row) => ({ ...row, id: String(row.id), url: null }));

    return ok({ items: signed });
  }, req);
}
