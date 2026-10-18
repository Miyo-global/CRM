import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPageGrants } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0049: take a grant back.
 *
 * Revoked rather than deleted, so the record of who had access and when
 * survives; access itself ends at once, because every read filters on
 * revoked_at IS NULL.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ pageId: string; grantId: string }> },
) {
  const { pageId, grantId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const grant = Number(grantId);
    if (!Number.isSafeInteger(grant) || grant <= 0) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const updated = await db
      .update(kbPageGrants)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(kbPageGrants.orgId, session.orgId),
          eq(kbPageGrants.pageId, id),
          eq(kbPageGrants.id, grant),
          isNull(kbPageGrants.revokedAt),
        ),
      )
      .returning({ id: kbPageGrants.id });

    if (updated.length === 0) return kbNotFound();

    await createAuditLog({
      action: "kb.grant.revoked",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { grantId: grant },
    });

    return ok({ id: grant, revoked: true });
  }, req);
}
