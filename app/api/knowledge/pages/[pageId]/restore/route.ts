import type { NextRequest } from "next/server";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { restoreSubtree } from "@/lib/knowledge/page-lifecycle";

/** KB-0043: bring a trashed page and its children back. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    // A trashed page is still visible to whoever could manage it, which is who
    // may undo the delete.
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const result = await restoreSubtree(session.orgId, id, session.user.id);
    if (result.restored.length === 0) return err("That page is not in the trash.", 409);

    await createAuditLog({
      action: "kb.page.restored",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { restored: result.restored.length, reparented: result.reparented },
    });

    return ok(result);
  }, req);
}
