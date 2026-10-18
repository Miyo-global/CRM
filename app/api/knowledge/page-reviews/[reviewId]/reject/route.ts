import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";
import { rejectReview } from "@/lib/knowledge/reviews";

/** A rejection without a reason is just a bounce, so the note is required. */
const schema = z
  .object({ note: z.string().trim().min(1, "Say why it was rejected.").max(2000) })
  .strict();

/** KB-0060: reject, returning the page to draft. */
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
      const result = await rejectReview(session.orgId, id, session.user.id, note);
      if (!result) return err("That review is not open.", 409);

      await createAuditLog({
        action: "kb.page.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(result.pageId),
        targetType: "kb_page",
        metadata: { reviewId: id, decision: "rejected" },
      });

      return ok(result);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid note.", 400);
      throw error;
    }
  }, req);
}
