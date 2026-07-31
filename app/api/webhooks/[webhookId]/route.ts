import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ webhookId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { webhookId: id } = await ctx.params;
  const webhookId = Number(id);
  if (!Number.isFinite(webhookId)) return err("Invalid webhook id", 400);

  return withAuth(async (session) => {
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(
        eq(webhookEndpoints.id, webhookId),
        eq(webhookEndpoints.orgId, session.orgId)
      ),
    });
    if (!endpoint) return err("Webhook endpoint not found", 404);

    const { secret: _secret, ...safe } = endpoint;
    return ok(safe);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { webhookId: id } = await ctx.params;
  const webhookId = Number(id);
  if (!Number.isFinite(webhookId)) return err("Invalid webhook id", 400);

  return withAdmin(async (session) => {
    const input = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(webhookEndpoints)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(webhookEndpoints.id, webhookId),
          eq(webhookEndpoints.orgId, session.orgId)
        )
      )
      .returning();

    if (!updated) return err("Webhook endpoint not found", 404);
    const { secret: _secret, ...safe } = updated;
    return ok(safe);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { webhookId: id } = await ctx.params;
  const webhookId = Number(id);
  if (!Number.isFinite(webhookId)) return err("Invalid webhook id", 400);

  return withAdmin(async (session) => {
    const [deleted] = await db
      .delete(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.id, webhookId),
          eq(webhookEndpoints.orgId, session.orgId)
        )
      )
      .returning({ id: webhookEndpoints.id });

    if (!deleted) return err("Webhook endpoint not found", 404);
    return ok({ success: true });
  });
}
