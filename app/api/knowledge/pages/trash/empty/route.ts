import type { NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { purgePages } from "@/lib/knowledge/purge";

/** KB-0044: empty the trash. Held pages stay behind and are reported. */
export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:purge");
    if (denied) return denied;

    const trashed = await db
      .select({ id: kbPages.id })
      .from(kbPages)
      .where(and(eq(kbPages.orgId, session.orgId), isNotNull(kbPages.deletedAt)))
      .limit(500);

    const result = await purgePages(
      session.orgId,
      trashed.map((row) => row.id),
    );

    await createAuditLog({
      action: "kb.page.purged",
      userId: session.user.id,
      orgId: session.orgId,
      targetType: "kb_page",
      metadata: { emptied: result.purged.length, held: result.held, incomplete: result.incomplete },
    });

    return ok(result);
  }, req);
}
