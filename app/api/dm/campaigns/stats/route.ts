import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns, dmLeads } from "@/lib/db/schema";
import { eq, count, sum } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const [[campaignAgg], [leadsAgg]] = await Promise.all([
      db
        .select({
          total: count(),
          totalSpend: sum(crmCampaigns.budgetSpent),
        })
        .from(crmCampaigns)
        .where(eq(crmCampaigns.orgId, session.orgId)),
      db
        .select({ totalLeads: count() })
        .from(dmLeads)
        .where(eq(dmLeads.orgId, session.orgId)),
    ]);

    return ok({
      total: campaignAgg?.total ?? 0,
      totalLeads: Number(leadsAgg?.totalLeads ?? 0),
      totalSpend: Number(campaignAgg?.totalSpend ?? 0),
    });
  });
}
