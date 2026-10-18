import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { purgeImpact } from "@/lib/knowledge/purge";

const schema = z
  .object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(500) })
  .strict();

/** KB-0044: what a purge would destroy, before it is asked for. */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:purge");
    if (denied) return denied;

    try {
      const { ids } = await parseBody(req, schema);
      return ok(await purgeImpact(session.orgId, ids));
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid ids.", 400);
      throw error;
    }
  }, req);
}
