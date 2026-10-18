import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

const schema = z.object({ locked: z.boolean() }).strict();

/** KB-0047: lock a page against editing. Needs manage, as unlocking does. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const { locked } = await parseBody(req, schema);
      await db
        .update(kbPages)
        .set({ isLocked: locked, updatedAt: new Date(), lastEditedById: session.user.id })
        .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));

      await createAuditLog({
        action: "kb.page.locked",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(id),
        targetType: "kb_page",
        metadata: { locked },
      });

      return ok({ id, isLocked: locked });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid request.", 400);
      throw error;
    }
  }, req);
}
