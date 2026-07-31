import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientOpportunities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { type NextRequest } from "next/server";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(["upsell", "cross_sell"]).optional(),
  stage: z.enum(["identified", "proposed", "negotiating", "won", "lost"]).optional(),
  value: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ oppId: string }> };


export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { oppId: rawId } = await ctx.params;
  const oppId = Number(rawId);
  if (!Number.isFinite(oppId)) return err("Invalid opportunity id", 400);

  return withAuth(async (session) => {
    const existing = await db.query.clientOpportunities.findFirst({
      where: and(
        eq(clientOpportunities.id, oppId),
        eq(clientOpportunities.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!existing) return err("Opportunity not found", 404);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err("Invalid input", 400);

    const { title, type, stage, value, notes, expectedCloseDate } = parsed.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (stage !== undefined) updateData.stage = stage;
    if (value !== undefined) updateData.value = value;
    if (notes !== undefined) updateData.notes = notes;
    if (expectedCloseDate !== undefined) updateData.expectedCloseDate = expectedCloseDate;

    const [updated] = await db
      .update(clientOpportunities)
      .set(updateData)
      .where(and(eq(clientOpportunities.id, oppId), eq(clientOpportunities.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}


export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { oppId: rawId } = await ctx.params;
  const oppId = Number(rawId);
  if (!Number.isFinite(oppId)) return err("Invalid opportunity id", 400);

  return withAuth(async (session) => {
    const existing = await db.query.clientOpportunities.findFirst({
      where: and(
        eq(clientOpportunities.id, oppId),
        eq(clientOpportunities.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!existing) return err("Opportunity not found", 404);

    await db
      .delete(clientOpportunities)
      .where(and(eq(clientOpportunities.id, oppId), eq(clientOpportunities.orgId, session.orgId)));

    return ok({ success: true });
  });
}
