"server-only";

import { db } from "@/lib/db";
import {
  leads,
  leadActivities,
  clients,
  deals,
  users,
  organizationMembers,
} from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  sql,
  gte,
  lte,
  isNull,
} from "drizzle-orm";

export async function getLeadSlaAlerts(
  orgId: string,
  opts?: { role?: string; userId?: string }
) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const slaFilters = [
    eq(leads.orgId, orgId),
    isNull(leads.deletedAt),
    sql`${leads.status} IN ('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED')`,
  ];
  if (opts?.role === "SALES" && opts.userId) {
    slaFilters.push(eq(leads.assignedToId, opts.userId));
  }

  const allLeads = await db.query.leads.findMany({
    where: and(...slaFilters),
    with: { assignedTo: { columns: { id: true, name: true } } },
  });

  const slaBreached: {
    leadId: number;
    leadName: string;
    status: string;
    assignedTo: string | null;
    hoursSinceUpdate: number;
    priority: string | null;
  }[] = [];

  for (const lead of allLeads) {
    const updatedAt = lead.updatedAt
      ? new Date(lead.updatedAt)
      : lead.createdAt
        ? new Date(lead.createdAt)
        : now;

    if (updatedAt < twentyFourHoursAgo) {
      const hoursSince = Math.round(
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
      );
      slaBreached.push({
        leadId: lead.id,
        leadName: lead.name,
        status: lead.status,
        assignedTo: lead.assignedTo?.name || null,
        hoursSinceUpdate: hoursSince,
        priority: lead.priority,
      });
    }
  }

  slaBreached.sort((a, b) => b.hoursSinceUpdate - a.hoursSinceUpdate);
  return { total: slaBreached.length, leads: slaBreached };
}

export async function getLeadAnalytics(
  orgId: string,
  filters?: { dateFrom?: string; dateTo?: string }
) {
  const f = [eq(leads.orgId, orgId), isNull(leads.deletedAt)];
  if (filters?.dateFrom) f.push(gte(leads.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo) f.push(lte(leads.createdAt, new Date(filters.dateTo + "T23:59:59")));

  const allLeadsData = await db.query.leads.findMany({
    where: and(...f),
    columns: {
      id: true,
      status: true,
      source: true,
      assignedToId: true,
      createdAt: true,
      potentialValue: true,
    },
  });

  const totalLeads = allLeadsData.length;
  const converted = allLeadsData.filter((l) => l.status === "CONVERTED").length;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const prevPeriodLeads = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      isNull(leads.deletedAt),
      gte(leads.createdAt, sixtyDaysAgo),
      lte(leads.createdAt, thirtyDaysAgo)
    ),
    columns: { id: true, status: true },
  });
  const prevTotal = prevPeriodLeads.length;
  const prevConverted = prevPeriodLeads.filter((l) => l.status === "CONVERTED").length;
  const prevConversionRate =
    prevTotal > 0 ? Math.round((prevConverted / prevTotal) * 100) : 0;

  const wonDealsFilters = [eq(deals.orgId, orgId), eq(deals.stage, "WON")];
  if (filters?.dateFrom)
    wonDealsFilters.push(gte(deals.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo)
    wonDealsFilters.push(lte(deals.createdAt, new Date(filters.dateTo + "T23:59:59")));
  const wonDeals = await db.query.deals.findMany({
    where: and(...wonDealsFilters),
    columns: { value: true, createdAt: true },
  });
  const totalRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);

  const conversionBySource: {
    source: string;
    total: number;
    converted: number;
    rate: number;
  }[] = [];
  const sourceMap = new Map<string, { total: number; converted: number }>();
  for (const l of allLeadsData) {
    const src = l.source ?? "other";
    const entry = sourceMap.get(src) || { total: 0, converted: 0 };
    entry.total++;
    if (l.status === "CONVERTED") entry.converted++;
    sourceMap.set(src, entry);
  }
  for (const [source, data] of sourceMap) {
    conversionBySource.push({
      source: source.replace(/_/g, " "),
      total: data.total,
      converted: data.converted,
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
    });
  }

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  const monthMap = new Map<string, number>();
  for (const d of wonDeals) {
    const date = d.createdAt;
    if (!date) continue;
    const m = new Date(date);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + Number(d.value ?? 0));
  }
  const sortedMonths = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);
  for (const [month, revenue] of sortedMonths) {
    monthlyRevenue.push({ month, revenue });
  }

  const orgMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: { columns: { id: true, name: true, role: true } } },
  });
  const salesUsers = orgMembers
    .filter((m) => m.user.role === "SALES")
    .map((m) => m.user);
  const memberNameById = new Map<string, string>();
  for (const m of orgMembers) {
    memberNameById.set(m.user.id, m.user.name ?? "Unknown");
  }
  const assignMap = new Map<string, number>();
  for (const l of allLeadsData) {
    if (l.assignedToId)
      assignMap.set(l.assignedToId, (assignMap.get(l.assignedToId) ?? 0) + 1);
  }
  const distributionIds = new Set<string>([
    ...salesUsers.map((u) => u.id),
    ...assignMap.keys(),
  ]);
  const assignmentDistribution = Array.from(distributionIds).map((userId) => ({
    userId,
    name: memberNameById.get(userId) ?? "Unknown",
    count: assignMap.get(userId) ?? 0,
  }));

  return {
    totalLeads,
    totalLeadsPrevPeriod: prevTotal,
    conversionRate,
    conversionRatePrevPeriod: prevConversionRate,
    totalRevenue,
    conversionBySource,
    monthlyRevenue,
    assignmentDistribution,
  };
}

export async function getDashboardMetrics(orgId: string) {
  const [allLeads, allActivities] = await Promise.all([
    db.query.leads.findMany({
      where: and(eq(leads.orgId, orgId), isNull(leads.deletedAt)),
    }),
    db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
    }),
  ]);

  const activeClients = allLeads.filter((l) => l.status === "CONVERTED").length;
  const inactiveClients = allLeads.filter((l) => l.status === "LOST").length;
  const totalCalls = allActivities.filter((a) => a.type === "call").length;
  const inPersonMeetings = allActivities.filter(
    (a) => a.type === "meeting" || a.type === "site_visit"
  ).length;

  const now = new Date();
  const followUpDue = allLeads.filter((l) => {
    if (l.status === "CONVERTED" || l.status === "LOST") return false;
    const updatedSource = l.updatedAt ?? l.createdAt;
    if (!updatedSource) return false;
    const updated = new Date(updatedSource);
    const daysSince = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= 3;
  }).length;

  return {
    activeClients,
    inactiveClients,
    totalCalls,
    inPersonMeetings,
    followUpDue,
    totalLeads: allLeads.length,
    conversionRate:
      allLeads.length > 0
        ? Math.round((activeClients / allLeads.length) * 1000) / 10
        : 0,
  };
}

export async function getUnverifiedLeads(orgId: string) {
  return db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      eq(leads.status, "NEW"),
      sql`${leads.verifiedById} IS NULL`
    ),
    with: { assignedTo: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(leads.createdAt)],
  });
}

export async function getLeadClients(
  orgId: string,
  filters?: { status?: "active" | "inactive"; search?: string; role?: string; userId?: string }
) {
  const f = [eq(clients.orgId, orgId)];
  if (filters?.role === "SALES" && filters.userId) {
    f.push(eq(clients.accountManagerId, filters.userId));
  }
  if (filters?.status) f.push(eq(clients.status, filters.status));

  let allClients = await db.query.clients.findMany({
    where: and(...f),
    with: {
      accountManager: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, source: true, priority: true } },
    },
    orderBy: [desc(clients.createdAt)],
  });

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    allClients = allClients.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s)
    );
  }

  return allClients;
}

export async function getSalesLeaderboard(orgId: string) {
  const [allLeads, allActivities] = await Promise.all([
    db.query.leads.findMany({
      where: and(eq(leads.orgId, orgId), isNull(leads.deletedAt)),
      columns: {
        id: true,
        status: true,
        assignedToId: true,
        potentialValue: true,
      },
    }),
    db.query.leadActivities.findMany({
      where: eq(leadActivities.orgId, orgId),
      columns: { id: true, type: true, userId: true },
    }),
  ]);

  const userMap = new Map<
    string,
    {
      totalCalls: number;
      totalMeetings: number;
      totalEmails: number;
      leadsAssigned: number;
      leadsConverted: number;
      totalRevenue: number;
      score: number;
    }
  >();

  for (const lead of allLeads) {
    if (!lead.assignedToId) continue;
    const entry = userMap.get(lead.assignedToId) || {
      totalCalls: 0,
      totalMeetings: 0,
      totalEmails: 0,
      leadsAssigned: 0,
      leadsConverted: 0,
      totalRevenue: 0,
      score: 0,
    };
    entry.leadsAssigned++;
    if (lead.status === "CONVERTED") {
      entry.leadsConverted++;
      entry.totalRevenue += Number(lead.potentialValue ?? 0);
    }
    userMap.set(lead.assignedToId, entry);
  }

  for (const activity of allActivities) {
    const entry = userMap.get(activity.userId) || {
      totalCalls: 0,
      totalMeetings: 0,
      totalEmails: 0,
      leadsAssigned: 0,
      leadsConverted: 0,
      totalRevenue: 0,
      score: 0,
    };
    if (activity.type === "call") entry.totalCalls++;
    if (activity.type === "meeting" || activity.type === "site_visit")
      entry.totalMeetings++;
    if (activity.type === "email") entry.totalEmails++;
    userMap.set(activity.userId, entry);
  }

  for (const [, entry] of userMap) {
    entry.score =
      entry.leadsConverted * 50 +
      entry.totalCalls * 5 +
      entry.totalMeetings * 10 +
      entry.totalEmails * 3;
  }

  const userIds = Array.from(userMap.keys());
  const usersData =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: sql`${users.id} = ANY(ARRAY[${sql.join(
            userIds.map((id) => sql`${id}`),
            sql`, `
          )}])`,
          columns: { id: true, name: true, image: true },
        })
      : [];

  const userLookup = new Map(usersData.map((u) => [u.id, u]));

  return Array.from(userMap.entries())
    .map(([userId, data]) => ({
      userId,
      name: userLookup.get(userId)?.name ?? "Unknown",
      image: userLookup.get(userId)?.image ?? null,
      ...data,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function getSalesTeamCapacity(orgId: string) {
  const salesMembers = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: {
      user: { columns: { id: true, name: true, image: true, role: true } },
    },
  });
  const salesUsers = salesMembers
    .filter((m) => m.user.role === "SALES")
    .map((m) => m.user);

  const activeLeadsList = await db.query.leads.findMany({
    where: and(
      eq(leads.orgId, orgId),
      isNull(leads.deletedAt),
      sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
      sql`${leads.assignedToId} IS NOT NULL`
    ),
    columns: { assignedToId: true },
  });

  const countMap = new Map<string, number>();
  for (const l of activeLeadsList) {
    if (l.assignedToId)
      countMap.set(l.assignedToId, (countMap.get(l.assignedToId) || 0) + 1);
  }

  return salesUsers.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    activeLeads: countMap.get(u.id) || 0,
  }));
}
