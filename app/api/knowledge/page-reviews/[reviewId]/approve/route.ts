import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";
import { approveReview } from "@/lib/knowledge/reviews";

const schema = z.object({ note: z.string().trim().max(2000).optional() }).strict();

/** KB-0060: approve. Publishes an approval review, re-verifies a freshness one. */
export async function POST(req: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:reviews:manage");
    if (denied) return denied;

    const id = Number(reviewId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    try {
      const { note } = await parseBody(req, schema);
      const result = await approveReview(session.orgId, id, session.user.id, note ?? null);
      // Null means gone or already decided; a second approval is not an error
      // worth a 500, but it is not a success either.
      if (!result) return err("That review is not open.", 409);

      await createAuditLog({
        action: "kb.page.published",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(result.pageId),
        targetType: "kb_page",
        metadata: { reviewId: id, decision: "approved" },
      });

      return ok(result);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid note.", 400);
      throw error;
    }
  }, req);
}
