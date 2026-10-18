import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { restoreSubtree } from "@/lib/knowledge/page-lifecycle";

const schema = z
  .object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(100) })
  .strict();

/** KB-0044: restore several pages, reporting each one's outcome. */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    try {
      const { ids } = await parseBody(req, schema);
      const results: Array<{ id: number; restored: number; status: string }> = [];

      for (const id of ids) {
        const decision = await resolvePageAccess(ctx.actor, id, "manage");
        if (decision.outcome !== "allowed") {
          results.push({ id, restored: 0, status: decision.outcome });
          continue;
        }
        const result = await restoreSubtree(session.orgId, id, session.user.id);
        results.push({
          id,
          restored: result.restored.length,
          status: result.restored.length > 0 ? "restored" : "not_in_trash",
        });
      }

      const restored = results.filter((r) => r.status === "restored").map((r) => r.id);
      if (restored.length > 0) {
        await createAuditLog({
          action: "kb.page.restored",
          userId: session.user.id,
          orgId: session.orgId,
          targetType: "kb_page",
          metadata: { ids: restored },
        });
      }

      return ok({ results });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid ids.", 400);
      throw error;
    }
  }, req);
}
