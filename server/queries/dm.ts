"server-only";

import { db } from "@/lib/db";
import { dmLeads, crmCampaigns } from "@/lib/db/schema";
import { eq, and, desc, count, like, or } from "drizzle-orm";

export interface DmLeadFilters {
  status?: "pending_review" | "verified" | "sent_to_hr" | "imported_to_pipeline";
  platform?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getDmLeads(orgId: string, filters?: DmLeadFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const filterList: ReturnType<typeof eq>[] = [eq(dmLeads.orgId, orgId)];

  if (filters?.status) filterList.push(eq(dmLeads.status, filters.status));
  if (filters?.platform)
    filterList.push(eq(dmLeads.sourcePlatform, filters.platform));
  if (filters?.search) {
    const escaped = filters.search.replace(/[\\%_]/g, (m) => `\\${m}`);
    filterList.push(
      or(
        like(dmLeads.name, `%${escaped}%`),
        like(dmLeads.email, `%${escaped}%`),
        like(dmLeads.phone, `%${escaped}%`)
      )!
    );
  }

  const [items, [countResult]] = await Promise.all([
    db.query.dmLeads.findMany({
      where: and(...filterList),
      orderBy: [desc(dmLeads.dateCaptured)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: count() })
      .from(dmLeads)
      .where(and(...filterList)),
  ]);

  return {
    leads: items,
    totalCount: countResult?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export interface DmCampaignFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export async function getDmCampaigns(orgId: string, filters?: DmCampaignFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const filterList: ReturnType<typeof eq>[] = [
    eq(crmCampaigns.orgId, orgId),
  ];

  if (
    filters?.status &&
    (["active", "paused", "completed"] as const).includes(
      filters.status as "active" | "paused" | "completed"
    )
  )
    filterList.push(
      eq(crmCampaigns.status, filters.status as "active" | "paused" | "completed")
    );

  const [items, [countResult]] = await Promise.all([
    db.query.crmCampaigns.findMany({
      where: and(...filterList),
      orderBy: [desc(crmCampaigns.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db
      .select({ count: count() })
      .from(crmCampaigns)
      .where(and(...filterList)),
  ]);

  const leadsPerCampaign = await db
    .select({
      campaignId: dmLeads.campaignId,
      count: count(),
    })
    .from(dmLeads)
    .where(eq(dmLeads.orgId, orgId))
    .groupBy(dmLeads.campaignId);

  const leadsMap = new Map(
    leadsPerCampaign.map((l) => [l.campaignId, l.count])
  );

  const enriched = items.map((c) => {
    const leadsGenerated = leadsMap.get(c.id) || 0;
    const spent = c.budgetSpent != null ? Number(c.budgetSpent) : NaN;
    return {
      ...c,
      leadsGenerated,
      costPerLead:
        leadsGenerated > 0 && Number.isFinite(spent)
          ? spent / leadsGenerated
          : null,
    };
  });

  return {
    campaigns: enriched,
    totalCount: countResult?.count ?? 0,
    page,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}
