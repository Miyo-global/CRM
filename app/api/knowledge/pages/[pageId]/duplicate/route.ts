import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { duplicatePage } from "@/lib/knowledge/page-lifecycle";

const schema = z.object({ includeChildren: z.boolean().default(false) }).strict();

/** KB-0042: copy a page, or a whole subtree, as drafts. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    // Copying is a read of the original and a write of something new, so view
    // on the source is the right bar.
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const { includeChildren } = await parseBody(req, schema);
      const result = await duplicatePage(session.orgId, id, session.user.id, includeChildren);
      if (!result) return kbNotFound();

      await createAuditLog({
        action: "kb.page.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(result.rootId),
        targetType: "kb_page",
        metadata: { duplicatedFrom: id, created: result.created, includeChildren },
      });

      return ok(result, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid request.", 400);
      throw error;
    }
  }, req);
}
