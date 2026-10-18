import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { approveReview, rejectReview } from "@/lib/knowledge/reviews";

const schema = z
  .object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(50),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((body) => body.decision === "approve" || !!body.note, {
    message: "A rejection needs a note.",
  });

/**
 * KB-0060: decide up to 50 reviews at once.
 *
 * Per-id results rather than all-or-nothing: in a queue of fifty, one already
 * decided elsewhere should not undo the other forty-nine.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:reviews:manage");
    if (denied) return denied;

    try {
      const body = await parseBody(req, schema);
      const results: Array<{ id: number; status: string; pageId?: number }> = [];

      for (const id of body.ids) {
        const result =
          body.decision === "approve"
            ? await approveReview(session.orgId, id, session.user.id, body.note ?? null)
            : await rejectReview(session.orgId, id, session.user.id, body.note ?? "");

        results.push(
          result
            ? { id, status: result.status, pageId: result.pageId }
            : { id, status: "not_open" },
        );
      }

      const decided = results.filter((r) => r.status !== "not_open");
      if (decided.length > 0) {
        await createAuditLog({
          action: "kb.page.updated",
          userId: session.user.id,
          orgId: session.orgId,
          targetType: "kb_page",
          metadata: { bulkDecision: body.decision, reviewIds: decided.map((r) => r.id) },
        });
      }

      return ok({ results });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid request.", 400);
      throw error;
    }
  }, req);
}
