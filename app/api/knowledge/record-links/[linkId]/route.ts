import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageLinks } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** KB-0059: unlink a record. Takes edit on the page that holds the link. */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(linkId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const link = await db.query.kbPageLinks.findFirst({
      where: and(eq(kbPageLinks.id, id), eq(kbPageLinks.orgId, session.orgId)),
      columns: { id: true, sourcePageId: true },
    });
    if (!link) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, link.sourcePageId, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    await db
      .delete(kbPageLinks)
      .where(and(eq(kbPageLinks.id, id), eq(kbPageLinks.orgId, session.orgId)));

    return ok({ id, deleted: true });
  }, req);
}
