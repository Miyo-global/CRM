import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageAttachments } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0058: detach a file.
 *
 * Soft delete: the object stays in R2 until the page is purged, so an
 * accidental removal is recoverable and the purge ledger stays the one place
 * that deletes bytes.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ pageId: string; attachmentId: string }> },
) {
  const { pageId, attachmentId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const attachment = Number(attachmentId);
    if (!Number.isSafeInteger(attachment) || attachment <= 0) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    // Scoped by org *and* page, so another org's id is a 404 and not a delete.
    const updated = await db
      .update(kbPageAttachments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(kbPageAttachments.orgId, session.orgId),
          eq(kbPageAttachments.pageId, id),
          eq(kbPageAttachments.id, attachment),
          isNull(kbPageAttachments.deletedAt),
        ),
      )
      .returning({ id: kbPageAttachments.id });

    if (updated.length === 0) return kbNotFound();

    return ok({ id: String(attachment), deleted: true });
  }, req);
}
