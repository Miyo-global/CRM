import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailCampaigns, emailCampaignRecipients, leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, "At least one lead is required"),
});


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "DIGITAL_MARKETING" && role !== "CEO" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { campaignId: campaignIdStr } = await params;
    const campaignId = Number(campaignIdStr);
    if (isNaN(campaignId) || campaignId <= 0) return err("Invalid campaign ID", 400);

    const { leadIds } = await parseBody(req, bodySchema);

    const [campaign] = await db
      .select({ id: emailCampaigns.id, status: emailCampaigns.status, scheduledAt: emailCampaigns.scheduledAt })
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.orgId, session.orgId)));

    if (!campaign) return err("Campaign not found", 404);
    if (campaign.status !== "draft") return err("Only draft campaigns can be sent", 400);
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      return err(`Campaign is scheduled to send on ${campaign.scheduledAt.toISOString()}.`, 400);
    }

    const matchedLeads = await db
      .select({ id: leads.id, name: leads.name, email: leads.email })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          inArray(leads.id, leadIds),
        ),
      );

    const validLeads = matchedLeads.filter((l) => l.email != null);
    const sentCount = validLeads.length;
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [transitioned] = await tx
        .update(emailCampaigns)
        .set({
          status: "sent",
          sentCount: sentCount,
          recipientCount: sentCount,
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

      if (!transitioned) return null;

      if (validLeads.length > 0) {
        await tx.insert(emailCampaignRecipients).values(
          validLeads.map((l) => ({
            campaignId,
            leadId: l.id,
            email: l.email!,
            name: l.name,
            status: "sent" as const,
            sentAt: now,
          })),
        );
      }
      return transitioned;
    });

    if (!result) return err("Only draft campaigns can be sent", 400);

    return ok({ sent: sentCount, campaignId });
  });
}
