import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbSpaces } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";
import { archiveSpace, spaceArchiveImpact } from "@/lib/knowledge/space-lifecycle";

/** KB-0036: retire a space. Its pages become read-only and its links are revoked. */
export async function POST(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:spaces:manage");
    if (denied) return denied;

    const id = Number(spaceId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const space = await db.query.kbSpaces.findFirst({
      where: and(eq(kbSpaces.id, id), eq(kbSpaces.orgId, session.orgId)),
      columns: { id: true, archivedAt: true, deletedAt: true },
    });
    if (!space || space.deletedAt) return kbNotFound();
    if (space.archivedAt) return err("This space is already archived.", 409);

    const impact = await spaceArchiveImpact(session.orgId, space.id);
    await archiveSpace(session.orgId, space.id);

    await createAuditLog({
      action: "kb.space.archived",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(space.id),
      targetType: "kb_space",
      metadata: { ...impact },
    });

    return ok({ id: space.id, archived: true, impact });
  }, req);
}
