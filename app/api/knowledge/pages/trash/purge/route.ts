import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { purgePages } from "@/lib/knowledge/purge";

const schema = z
  .object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(100) })
  .strict();

/** KB-0044: destroy the named pages. Legal hold wins over the request. */
export async function DELETE(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:purge");
    if (denied) return denied;

    try {
      const { ids } = await parseBody(req, schema);
      const result = await purgePages(session.orgId, ids);

      if (result.purged.length > 0) {
        await createAuditLog({
          action: "kb.page.purged",
          userId: session.user.id,
          orgId: session.orgId,
          targetType: "kb_page",
          metadata: { ids: result.purged, incomplete: result.incomplete },
        });
      }

      // Nothing could be purged because every id was held: say so plainly.
      if (result.purged.length === 0 && result.held.length > 0) {
        return err(
          `Under legal hold and not purged: ${result.held.join(", ")}.`,
          409,
        );
      }

      return ok(result);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid ids.", 400);
      throw error;
    }
  }, req);
}
