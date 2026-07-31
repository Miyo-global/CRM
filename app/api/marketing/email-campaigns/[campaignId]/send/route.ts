import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns, emailCampaignRecipients, leads } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

type Ctx = { params: Promise<{ campaignId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { campaignId: id } = await ctx.params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId)) return err("Invalid campaign id", 400);

  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "DIGITAL_MARKETING" && role !== "CEO" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)));

    if (!campaign) return err("Campaign not found", 404);
    if (campaign.status !== "draft") return err(`Campaign is already ${campaign.status}`, 400);
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      return err(`Campaign is scheduled to send on ${campaign.scheduledAt.toISOString()}.`, 400);
    }

    const filter = campaign.recipientFilter as Record<string, string | string[]> | null;
    const conditions = [eq(leads.orgId, session.orgId), isNotNull(leads.email)];

    if (filter?.status) conditions.push(sql`${leads.status} = ${filter.status}`);
    if (filter?.source) conditions.push(sql`${leads.source} = ${filter.source}`);
    if (filter?.priority) conditions.push(sql`${leads.priority} = ${filter.priority}`);

    const matchedLeads = await db
      .select({ id: leads.id, name: leads.name, email: leads.email })
      .from(leads)
      .where(and(...conditions))
      .limit(500);

    if (matchedLeads.length === 0) {
      return err("No leads match the recipient filter", 400);
    }

    const now = new Date();

    const claimed = await db.transaction(async (tx) => {
      const [transitioned] = await tx
        .update(emailCampaigns)
        .set({
          status: "sent",
          recipientCount: matchedLeads.length,
          sentCount: matchedLeads.length,
          sentAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(emailCampaigns.id, campaignId),
            eq(emailCampaigns.orgId, session.orgId),
            eq(emailCampaigns.status, "draft"),
          ),
        )
        .returning({ id: emailCampaigns.id });

      if (!transitioned) return false;

      await tx.insert(emailCampaignRecipients).values(
        matchedLeads.map((lead) => ({
          campaignId,
          leadId: lead.id,
          email: lead.email!,
          name: lead.name,
          status: "sent" as const,
          sentAt: now,
        })),
      );

      return true;
    });

    if (!claimed) return err("Campaign is already being sent", 409);

    return ok({
      sent: matchedLeads.length,
      campaignId,
      status: "sent",
    });
  });
}
