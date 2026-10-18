import type { NextRequest } from "next/server";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";
import { purgePages } from "@/lib/knowledge/purge";

/** KB-0044: destroy one page for good. */
export async function DELETE(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:purge");
    if (denied) return denied;

    const id = Number(pageId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const result = await purgePages(session.orgId, [id]);
    if (result.held.includes(id)) {
      return err("This page is under legal hold and cannot be purged.", 409);
    }
    if (result.purged.length === 0 && result.incomplete.length === 0) return kbNotFound();

    await createAuditLog({
      action: "kb.page.purged",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { incomplete: result.incomplete.length > 0 },
    });

    return ok(result);
  }, req);
}
