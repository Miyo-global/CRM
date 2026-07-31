import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const budgetField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative amount with up to 2 decimals")
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1_000_000_000, "Amount out of range")
  .optional();

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  channel: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetAudience: z.string().optional(),
  budgetAllocated: budgetField,
  budgetSpent: budgetField,
});

type Ctx = { params: Promise<{ campaignId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const campaign = await db.query.crmCampaigns.findFirst({
      where: and(eq(crmCampaigns.id, campaignId), eq(crmCampaigns.orgId, session.orgId)),
    });
    if (!campaign) return err("Campaign not found", 404);
    return ok(campaign);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(crmCampaigns)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(crmCampaigns.id, campaignId), eq(crmCampaigns.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Campaign not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const [deleted] = await db
      .delete(crmCampaigns)
      .where(and(eq(crmCampaigns.id, campaignId), eq(crmCampaigns.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Campaign not found", 404);
    return ok({ success: true });
  });
}
