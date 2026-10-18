import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageVisits } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** A reopen inside this window is the same visit, not a new one. */
export const VISIT_DEDUPE_MS = 5 * 60 * 1000;

/**
 * KB-0040: record that this person opened the page.
 *
 * One row per reader per page, moved forward at most once every five minutes,
 * so flipping between two pages does not write on every keystroke of
 * navigation.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const existing = await db.query.kbPageVisits.findFirst({
      where: and(
        eq(kbPageVisits.orgId, session.orgId),
        eq(kbPageVisits.pageId, id),
        eq(kbPageVisits.userId, session.user.id),
      ),
      columns: { id: true, visitedAt: true },
    });

    if (!existing) {
      await db
        .insert(kbPageVisits)
        .values({ orgId: session.orgId, pageId: id, userId: session.user.id })
        .onConflictDoNothing();
      return ok({ pageId: id, recorded: true });
    }

    const age = Date.now() - existing.visitedAt.getTime();
    if (age < VISIT_DEDUPE_MS) return ok({ pageId: id, recorded: false });

    await db
      .update(kbPageVisits)
      .set({ visitedAt: new Date() })
      .where(and(eq(kbPageVisits.id, existing.id), eq(kbPageVisits.orgId, session.orgId)));

    return ok({ pageId: id, recorded: true });
  }, req);
}
