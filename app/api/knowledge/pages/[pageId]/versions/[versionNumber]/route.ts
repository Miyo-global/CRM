import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageVersions } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

/** KB-0046: one recorded version, with its content, for the diff view. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ pageId: string; versionNumber: string }> },
) {
  const { pageId, versionNumber } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const version = Number(versionNumber);
    if (!Number.isSafeInteger(version) || version <= 0) return kbNotFound();

    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const row = await db.query.kbPageVersions.findFirst({
      where: and(
        eq(kbPageVersions.orgId, session.orgId),
        eq(kbPageVersions.pageId, id),
        eq(kbPageVersions.versionNumber, version),
      ),
    });
    if (!row) return kbNotFound();

    return ok(row);
  }, req);
}
