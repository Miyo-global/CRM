import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns, leads, crmLeads, dmLeads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const budgetField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative amount with up to 2 decimals")
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1_000_000_000, "Amount out of range")
  .optional();

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: z.enum(["active", "paused", "completed"]).optional(),
    budgetAllocated: budgetField,
    budgetSpent: budgetField,
  })
  .superRefine((data, ctx) => {
    if (data.budgetAllocated !== undefined && data.budgetSpent !== undefined) {
      if (Number(data.budgetSpent) > Number(data.budgetAllocated)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Budget spent cannot exceed allocated", path: ["budgetSpent"] });
      }
    }
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { campaignId } = await params;
      const id = Number(campaignId);
      if (!Number.isFinite(id)) return err("Invalid ID", 400);

      const body = await req.json();
      const data = updateSchema.parse(body);

      const [updated] = await db
        .update(crmCampaigns)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(crmCampaigns.id, id), eq(crmCampaigns.orgId, session.orgId)))
        .returning();

      if (!updated) return err("Campaign not found", 404);
      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update campaign",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { campaignId } = await params;
      const id = Number(campaignId);
      if (!Number.isFinite(id)) return err("Invalid ID", 400);

      const deleted = await db.transaction(async (tx) => {
        await tx
          .update(leads)
          .set({ campaignId: null })
          .where(and(eq(leads.campaignId, id), eq(leads.orgId, session.orgId)));
        await tx
          .update(crmLeads)
          .set({ campaignId: null })
          .where(and(eq(crmLeads.campaignId, id), eq(crmLeads.orgId, session.orgId)));
        await tx
          .update(dmLeads)
          .set({ campaignId: null })
          .where(and(eq(dmLeads.campaignId, id), eq(dmLeads.orgId, session.orgId)));
        const [row] = await tx
          .delete(crmCampaigns)
          .where(and(eq(crmCampaigns.id, id), eq(crmCampaigns.orgId, session.orgId)))
          .returning();
        return row;
      });

      if (!deleted) return err("Campaign not found", 404);
      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to delete campaign",
        500
      );
    }
  });
}
