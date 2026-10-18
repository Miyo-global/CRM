import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0047: publish a page.
 *
 * Publishing is the status change only; who may *read* it is visibility, which
 * is a separate call. Conflating them is how a page meant for the team ends up
 * on the internet.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, status: true, contentText: true },
    });
    if (!page) return kbNotFound();
    if (page.status === "published") return err("This page is already published.", 409);
    if (!page.contentText?.trim()) {
      return err("An empty page cannot be published.", 400);
    }

    await db
      .update(kbPages)
      .set({
        status: "published",
        publishedAt: new Date(),
        archivedAt: null,
        updatedAt: new Date(),
        lastEditedById: session.user.id,
      })
      .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

    await createAuditLog({
      action: "kb.page.published",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { from: page.status },
    });

    return ok({ id, status: "published" });
  }, req);
}
