import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageVersions } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { commitPageChange } from "@/lib/knowledge/page-writer";

/**
 * KB-0046: put an old version back.
 *
 * The restore forces a snapshot first, so the content being replaced is itself
 * recorded: a restore is an edit like any other and must be undoable. The
 * recorded version rows are never rewritten — the append-only trigger would
 * refuse anyway.
 */
export async function POST(
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

    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const row = await db.query.kbPageVersions.findFirst({
      where: and(
        eq(kbPageVersions.orgId, session.orgId),
        eq(kbPageVersions.pageId, id),
        eq(kbPageVersions.versionNumber, version),
      ),
      columns: { title: true, content: true, versionNumber: true },
    });
    if (!row) return kbNotFound();

    const result = await commitPageChange({
      orgId: session.orgId,
      pageId: id,
      actorId: session.user.id,
      action: "kb.version.restored",
      content: row.content,
      title: row.title,
      forceVersion: true,
      changeSummary: `Restored version ${row.versionNumber}`,
      metadata: { restoredFrom: row.versionNumber },
    });

    return ok({ id, restoredFrom: row.versionNumber, ...result });
  }, req);
}
