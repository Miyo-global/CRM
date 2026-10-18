import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbSpaces } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";
import { spaceArchiveImpact } from "@/lib/knowledge/space-lifecycle";

/** KB-0036: what archiving this space would affect. */
export async function GET(req: NextRequest, context: { params: Promise<{ spaceId: string }> }) {
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
      columns: { id: true, name: true, archivedAt: true, deletedAt: true },
    });
    if (!space || space.deletedAt) return kbNotFound();

    return ok({
      space: { id: space.id, name: space.name, archivedAt: space.archivedAt },
      impact: await spaceArchiveImpact(session.orgId, space.id),
    });
  }, req);
}
