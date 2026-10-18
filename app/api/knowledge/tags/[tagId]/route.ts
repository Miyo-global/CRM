import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbTags } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";

/** KB-0061: delete a tag. The links go with it by cascade; the pages stay. */
export async function DELETE(req: NextRequest, context: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:manage");
    if (denied) return denied;

    const id = Number(tagId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    await db
      .delete(kbTags)
      .where(and(eq(kbTags.id, id), eq(kbTags.orgId, session.orgId)));

    return ok({ id, deleted: true });
  }, req);
}
