import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** KB-0047: bring an archived page back as a draft, not as published. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, status: true },
    });
    if (!page) return kbNotFound();
    if (page.status !== "archived") return err("This page is not archived.", 409);

    await db
      .update(kbPages)
      .set({
        // Back to draft: re-publishing is a decision, not a side effect of
        // un-archiving.
        status: "draft",
        archivedAt: null,
        updatedAt: new Date(),
        lastEditedById: session.user.id,
      })
      .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

    await createAuditLog({
      action: "kb.page.archived",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { unarchived: true },
    });

    return ok({ id, status: "draft" });
  }, req);
}
