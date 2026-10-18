import type { NextRequest } from "next/server";
import { ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { importRequestSchema, planImport } from "@/lib/knowledge/import";

/** KB-0062: what the import would do. Reads only. */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:import");
    if (denied) return denied;

    try {
      const request = await parseBody(req, importRequestSchema);
      return ok(await planImport(session.orgId, request));
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid import.", 400);
      throw error;
    }
  }, req);
}
