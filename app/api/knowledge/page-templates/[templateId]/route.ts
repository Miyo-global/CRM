import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTemplates } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    icon: z.string().trim().max(60).nullable().optional(),
    content: z.unknown().optional(),
  })
  .strict();

/** KB-0055: one template. Writing needs kb:templates:manage. */
export async function GET(req: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(templateId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const row = await db.query.kbPageTemplates.findFirst({
      where: and(eq(kbPageTemplates.id, id), eq(kbPageTemplates.orgId, session.orgId)),
    });
    if (!row) return kbNotFound();

    return ok(row);
  }, req);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:templates:manage");
    if (denied) return denied;

    const id = Number(templateId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    try {
      const body = await parseBody(req, patchSchema);
      if (Object.keys(body).length === 0) return err("Nothing to change.", 400);

      const updated = await db
        .update(kbPageTemplates)
        .set({ ...(body as Record<string, never>), updatedAt: new Date() })
        .where(and(eq(kbPageTemplates.id, id), eq(kbPageTemplates.orgId, session.orgId)))
        .returning();

      if (updated.length === 0) return kbNotFound();
      return ok(updated[0]);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid template.", 400);
      // A rename onto an existing name hits the org+name unique.
      if (String(error).includes("uniq_kb_page_templates_org_name")) {
        return err("A template with that name already exists.", 409);
      }
      throw error;
    }
  }, req);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:templates:manage");
    if (denied) return denied;

    const id = Number(templateId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    // Pages made from a template keep their content, so this is not a cascade.
    await db
      .delete(kbPageTemplates)
      .where(and(eq(kbPageTemplates.id, id), eq(kbPageTemplates.orgId, session.orgId)));

    return ok({ id, deleted: true });
  }, req);
}
