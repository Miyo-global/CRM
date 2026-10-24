import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog, diffFields } from "@/lib/audit-log";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { getKbSettings, updateKbSettings } from "@/lib/knowledge/settings";

/**
 * KB-0034: the HR-document link flags on their own, which is what the HR
 * settings screen touches (D4: off by default).
 */
const patchSchema = z
  .object({
    hrmsKbLinkEnabled: z.boolean().optional(),
    hrmsKbSearchEnabled: z.boolean().optional(),
    hrmsKbAiEnabled: z.boolean().optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;
    const settings = await getKbSettings(session.orgId);
    return ok({
      hrmsKbLinkEnabled: settings.hrmsKbLinkEnabled,
      hrmsKbSearchEnabled: settings.hrmsKbSearchEnabled,
      hrmsKbAiEnabled: settings.hrmsKbAiEnabled,
    });
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

      const before = await getKbSettings(session.orgId);
      const settings = await updateKbSettings(session.orgId, body);
      // R3-ADM-09: only values that really changed, with old and new.
      const changes = diffFields(before as unknown as Record<string, unknown>, body);
      if (Object.keys(changes).length > 0) {
        await createAuditLog({
          action: "kb.settings.updated",
          userId: session.user.id,
          orgId: session.orgId,
          targetType: "kb_settings",
          metadata: { changedFields: Object.keys(changes), changes },
        });
      }
      return ok({
        hrmsKbLinkEnabled: settings.hrmsKbLinkEnabled,
        hrmsKbSearchEnabled: settings.hrmsKbSearchEnabled,
        hrmsKbAiEnabled: settings.hrmsKbAiEnabled,
      });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid flags.", 400);
      throw error;
    }
  }, req);
}
