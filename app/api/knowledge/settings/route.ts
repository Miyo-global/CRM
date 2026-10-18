import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { getKbSettings, updateKbSettings } from "@/lib/knowledge/settings";

/** KB-0034. Retention is in days: a year of trash, ten years of chat history. */
const patchSchema = z
  .object({
    trashRetentionDays: z.coerce.number().int().min(1).max(365).optional(),
    chatHistoryRetentionDays: z.coerce.number().int().min(1).max(3650).optional(),
    hrmsKbLinkEnabled: z.boolean().optional(),
    hrmsKbSearchEnabled: z.boolean().optional(),
    hrmsKbAiEnabled: z.boolean().optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;
    return ok(await getKbSettings(session.orgId));
  }, req);
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:settings:manage");
    if (denied) return denied;

    try {
      const body = await parseBody(req, patchSchema);
      if (Object.keys(body).length === 0) return err("Nothing to change.", 400);

      const settings = await updateKbSettings(session.orgId, body);
      await createAuditLog({
        action: "kb.settings.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetType: "kb_settings",
        metadata: body,
      });
      return ok(settings);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid settings.", 400);
      throw error;
    }
  }, req);
}
