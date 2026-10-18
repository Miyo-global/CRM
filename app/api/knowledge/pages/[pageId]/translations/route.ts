import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTranslations } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** KB-0064: the translations of one page. Readable by anyone who can read the page. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const rows = await db
      .select({
        locale: kbPageTranslations.locale,
        title: kbPageTranslations.title,
        excerpt: kbPageTranslations.excerpt,
        status: kbPageTranslations.status,
        revision: kbPageTranslations.revision,
        updatedAt: kbPageTranslations.updatedAt,
      })
      .from(kbPageTranslations)
      .where(
        and(eq(kbPageTranslations.orgId, session.orgId), eq(kbPageTranslations.pageId, id)),
      )
      .orderBy(asc(kbPageTranslations.locale));

    return ok({ items: rows });
  }, req);
}
