import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageFavorites } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** KB-0040: favouriting takes view access and nothing more. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    await db
      .insert(kbPageFavorites)
      .values({ orgId: session.orgId, pageId: id, userId: session.user.id })
      .onConflictDoNothing();

    return ok({ pageId: id, isFavorite: true });
  }, req);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    // Un-favouriting needs no access check: it only removes the caller's own row.
    await db
      .delete(kbPageFavorites)
      .where(
        and(
          eq(kbPageFavorites.orgId, session.orgId),
          eq(kbPageFavorites.pageId, id),
          eq(kbPageFavorites.userId, session.user.id),
        ),
      );

    return ok({ pageId: id, isFavorite: false });
  }, req);
}
