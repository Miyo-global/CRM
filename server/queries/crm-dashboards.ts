"server-only";

import { db } from "@/lib/db";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import {
  crmDeals,
  crmCampaigns,
  crmLeads,
  crmContent,
  crmEvents,
  crmActivities,
  crmSupportTickets,
  crmMonthlyMetrics,
  crmCompanies,
  crmPeople,
  leads,
  leadActivities,
  supportTickets,
  supportTicketMessages,
} from "@/lib/db/schema";
import { eq, and, desc, gte, count, sum, sql, ne, isNotNull } from "drizzle-orm";
import { subDays, subMonths, format } from "date-fns";
import { isSlaBreached, resolutionSlaHours } from "@/lib/constants/support-sla";
import {
  getSupportCsatAverage,
  getSupportTeamMembers,
  getSupportActivityFallback,
} from "@/server/queries/support";

function computeTrend(current: number, previous: number) {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, isPositive: change >= 0 };
}

function relativeTime(value: Date | string | null | undefined): string {
  if (!value) return "just now";
  const d = typeof value === "string" ? new Date(value) : value;
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return typeof value === "string" ? value : "just now";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return format(d, "MMM d");
}

const STAGE_ORDER = ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"] as const;
const STAGE_COLORS: Record<string, string> = {
  Discovery: "#3B82F6",
  Qualified: "#6366F1",
  Proposal: "#8B5CF6",
  Negotiation: "#A855F7",
  "Closed Won": "#10B981",
};

export async function getSalesDashboard(orgId: string) {
  return cached(CACHE_KEYS.salesDashboard(orgId), () => _getSalesDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getSalesDashboard(orgId: string) {

  const [stageAggs, topDealsRaw, leaderboardRaw, metrics, recentActivities, leadMetrics] =
    await Promise.all([
      db
        .select({
          stage: crmDeals.stage,
          dealCount: count(),
          totalValue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
        })
        .from(crmDeals)
        .where(eq(crmDeals.orgId, orgId))
        .groupBy(crmDeals.stage),

      db.query.crmDeals.findMany({
        where: and(eq(crmDeals.orgId, orgId), ne(crmDeals.stage, "Closed Won")),
        with: { salesRep: true },
        orderBy: [desc(crmDeals.value)],
        limit: 5,
      }),

      db
        .select({
          salesRepId: crmDeals.salesRepId,
          deals: count(),
          revenue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
        })
        .from(crmDeals)
        .where(and(eq(crmDeals.orgId, orgId), eq(crmDeals.stage, "Closed Won"), isNotNull(crmDeals.salesRepId)))
        .groupBy(crmDeals.salesRepId)
        .orderBy(desc(sql`sum(${crmDeals.value}::numeric)`))
        .limit(5),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db
        .select({ type: leadActivities.type, actCount: count() })
        .from(leadActivities)
        .innerJoin(leads, eq(leads.id, leadActivities.leadId))
        .where(and(eq(leads.orgId, orgId), gte(leadActivities.createdAt, subDays(new Date(), 7))))
        .groupBy(leadActivities.type),

      db
        .select({
          status: leads.status,
          cnt: count(),
        })
        .from(leads)
        .where(eq(leads.orgId, orgId))
        .groupBy(leads.status),
    ]);

  const stageMap = new Map(stageAggs.map((r) => [r.stage, r]));
  const pipelineValue = stageAggs.reduce((s, r) => s + r.totalValue, 0);
  const closedWonAgg = stageMap.get("Closed Won");
  const dealsWon = closedWonAgg?.dealCount ?? 0;
  const totalDeals = stageAggs.reduce((s, r) => s + r.dealCount, 0);
  const conversionRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;
  const avgDealSize = dealsWon > 0 ? (closedWonAgg?.totalValue ?? 0) / dealsWon : 0;

  const curr = metrics[0];
  const prev = metrics[1];

  const salesStats = {
    pipeline: {
      value: pipelineValue,
      trend: computeTrend(Number(curr?.revenue ?? 0), Number(prev?.revenue ?? 0)),
    },
    dealsWon: {
      value: dealsWon,
      trend: computeTrend(curr?.mqls ?? 0, prev?.mqls ?? 0),
    },
    conversionRate: {
      value: Math.round(conversionRate * 10) / 10,
      trend: computeTrend(Number(curr?.retention ?? 0), Number(prev?.retention ?? 0)),
    },
    avgDealSize: {
      value: Math.round(avgDealSize),
      trend: computeTrend(Number(curr?.csat ?? 0), Number(prev?.csat ?? 0)),
    },
  };

  const revenueTimeline = metrics
    .map((m) => ({ month: m.month, value: Number(m.revenue) }))
    .reverse();

  const salesFunnel = STAGE_ORDER.map((stage) => {
    const agg = stageMap.get(stage);
    return { stage, value: agg?.dealCount ?? 0, color: STAGE_COLORS[stage] };
  });

  const topDeals = topDealsRaw.map((d) => ({
    company: d.companyName,
    value: Number(d.value),
    stage: d.stage,
    rep: d.salesRep
      ? `${d.salesRep.name.split(" ")[0]} ${d.salesRep.name.split(" ")[1]?.[0] ?? ""}.`
      : "Unassigned",
    probability: d.probability ?? 0,
  }));

  const repIds = leaderboardRaw.map((r) => r.salesRepId).filter(Boolean) as number[];
  const people = repIds.length
    ? await db.query.crmPeople.findMany({
        where: (p, { inArray }) => inArray(p.id, repIds),
        columns: { id: true, name: true, initials: true },
      })
    : [];
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const salesLeaderboard = leaderboardRaw.map((r) => {
    const person = r.salesRepId ? peopleMap.get(r.salesRepId) : null;
    return {
      name: person?.name ?? "Unknown",
      deals: r.deals,
      revenue: r.revenue,
      avatar: person?.initials ?? "?",
    };
  });

  const dealsByStage = STAGE_ORDER.map((stage) => {
    const agg = stageMap.get(stage);
    return {
      stage,
      count: agg?.dealCount ?? 0,
      value: agg?.totalValue ?? 0,
      color: STAGE_COLORS[stage],
    };
  });

  const statusMap = new Map(leadMetrics.map((r) => [r.status, r.cnt]));
  const activityMap = Object.fromEntries(recentActivities.map((a) => [a.type, a.actCount]));

  const enhancedMetrics = {
    activeClients: statusMap.get("CONVERTED") ?? 0,
    inactiveClients: statusMap.get("LOST") ?? 0,
    totalCalls: activityMap["call"] ?? 0,
    totalMeetings: activityMap["meeting"] ?? 0,
    totalEmails: activityMap["email"] ?? 0,
    totalSiteVisits: activityMap["site_visit"] ?? 0,
    followUpNeeded: 0,
  };

  const salesActivities = await db.query.crmActivities.findMany({
    where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "sales")),
    orderBy: [desc(crmActivities.createdAt)],
    limit: 7,
  });
  const salesActivity = salesActivities.map((a) => ({
    type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  return {
    salesStats,
    revenueTimeline,
    salesFunnel,
    topDeals,
    salesLeaderboard,
    salesActivity,
    dealsByStage,
    enhancedMetrics,
  };
}

export async function getMarketingDashboard(orgId: string) {
  return cached(CACHE_KEYS.marketingDashboard(orgId), () => _getMarketingDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getMarketingDashboard(orgId: string) {
  const [allCampaigns, metrics, leadsByStatus, leadsByChannel, contentList, events] =
    await Promise.all([
      db.query.crmCampaigns.findMany({ where: eq(crmCampaigns.orgId, orgId) }),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db
        .select({ status: crmLeads.status, cnt: count() })
        .from(crmLeads)
        .where(eq(crmLeads.orgId, orgId))
        .groupBy(crmLeads.status),

      db
        .select({
          channel: sql<string>`COALESCE(${crmLeads.channel}, 'Other')`,
          cnt: count(),
        })
        .from(crmLeads)
        .where(eq(crmLeads.orgId, orgId))
        .groupBy(sql`COALESCE(${crmLeads.channel}, 'Other')`),

      db.query.crmContent.findMany({
        where: eq(crmContent.orgId, orgId),
        orderBy: [desc(crmContent.views)],
        limit: 5,
      }),

      db.query.crmEvents.findMany({
        where: eq(crmEvents.orgId, orgId),
        orderBy: [desc(crmEvents.id)],
        limit: 5,
      }),
    ]);

  const activeCampaigns = allCampaigns.filter((c) => c.status === "active").length;
  const totalLeads = allCampaigns.reduce((s, c) => s + (c.leads ?? 0), 0);
  const totalSpend = allCampaigns.reduce((s, c) => s + Number(c.spend), 0);
  const totalRoi = totalSpend > 0 ? Math.round((totalLeads * 100) / totalSpend) : 0;

  const mktCurr = metrics[0];
  const mktPrev = metrics[1];
  const latestMqls = mktCurr?.mqls ?? 0;

  const marketingStats = {
    campaigns: { value: activeCampaigns, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    leads: { value: totalLeads, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    mqls: { value: latestMqls, trend: computeTrend(mktCurr?.mqls ?? 0, mktPrev?.mqls ?? 0) },
    roi: { value: totalRoi, trend: computeTrend(Number(mktCurr?.revenue ?? 0), Number(mktPrev?.revenue ?? 0)) },
  };

  const mqlTimeline = metrics.map((m) => ({ month: m.month, value: m.mqls ?? 0 })).reverse();

  const statusMap = new Map(leadsByStatus.map((r) => [r.status, r.cnt]));
  const LEAD_STATUS_ORDER = ["visitor", "lead", "mql", "sql", "opportunity"];
  const LEAD_STATUS_LABELS: Record<string, string> = { visitor: "Visitors", lead: "Leads", mql: "MQLs", sql: "SQLs", opportunity: "Opportunities" };
  const LEAD_STATUS_COLORS: Record<string, string> = { visitor: "#3B82F6", lead: "#6366F1", mql: "#8B5CF6", sql: "#A855F7", opportunity: "#10B981" };
  const leadFunnel = LEAD_STATUS_ORDER.map((status) => ({
    stage: LEAD_STATUS_LABELS[status] ?? status,
    value: statusMap.get(status as "visitor" | "lead" | "mql" | "sql" | "opportunity") ?? 0,
    color: LEAD_STATUS_COLORS[status] ?? "#3B82F6",
  }));

  const campaigns = allCampaigns.map((c) => ({
    name: c.name,
    status: c.status as "active" | "paused" | "completed",
    leads: c.leads ?? 0,
    spend: Number(c.spend),
    roi: Number(c.roi),
  }));

  const totalLeadCount = leadsByChannel.reduce((s, r) => s + r.cnt, 0) || 1;
  const CHANNEL_COLORS: Record<string, string> = {
    "Organic Search": "#10B981",
    "Paid Ads": "#3B82F6",
    "Social Media": "#8B5CF6",
    Email: "#F59E0B",
    Referral: "#EF4444",
  };
  const channelBreakdown = leadsByChannel
    .sort((a, b) => b.cnt - a.cnt)
    .map(({ channel, cnt }) => ({
      label: channel,
      value: Math.round((cnt / totalLeadCount) * 100),
      color: CHANNEL_COLORS[channel] ?? "#6B7280",
    }));

  const contentPerformance = contentList.map((c) => ({
    title: c.title,
    type: c.type,
    views: c.views ?? 0,
    leads: c.leads ?? 0,
    convRate: Number(c.convRate),
  }));

  const upcomingEvents = events.map((e) => ({
    name: e.name,
    date: e.date,
    type: e.type,
    status: e.status as "planning" | "confirmed" | "completed",
  }));

  return { marketingStats, mqlTimeline, leadFunnel, campaigns, channelBreakdown, contentPerformance, upcomingEvents };
}

export async function getSupportDashboard(orgId: string) {
  return cached(CACHE_KEYS.supportDashboard(orgId), () => _getSupportDashboard(orgId), { ttlSeconds: CACHE_TTL.SHORT });
}

async function _getSupportDashboard(orgId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const sixtyDaysAgo = subDays(new Date(), 60);

  const [statusAggs, priorityAggs, supportActivities, tickets, respondedRows, csat, liveTeam] =
    await Promise.all([

      db
        .select({ status: supportTickets.status, cnt: count() })
        .from(supportTickets)
        .where(eq(supportTickets.orgId, orgId))
        .groupBy(supportTickets.status),

      db
        .select({ priority: supportTickets.priority, cnt: count() })
        .from(supportTickets)
        .where(eq(supportTickets.orgId, orgId))
        .groupBy(supportTickets.priority),

      db.query.crmActivities.findMany({
        where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "support")),
        orderBy: [desc(crmActivities.createdAt)],
        limit: 8,
      }),

      db
        .select({
          priority: supportTickets.priority,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
          resolvedAt: supportTickets.resolvedAt,
          closedAt: supportTickets.closedAt,
          slaDeadline: supportTickets.slaDeadline,
        })
        .from(supportTickets)
        .where(eq(supportTickets.orgId, orgId))
        .limit(2000),

      db
        .select({
          respondedTickets: sql<number>`count(distinct ${supportTicketMessages.ticketId})::int`,
        })
        .from(supportTicketMessages)
        .innerJoin(supportTickets, eq(supportTickets.id, supportTicketMessages.ticketId))
        .where(
          and(
            eq(supportTickets.orgId, orgId),
            eq(supportTicketMessages.isInternal, false),
            sql`${supportTicketMessages.authorId} <> ${supportTickets.createdBy}`,
          ),
        ),

      getSupportCsatAverage(orgId),
      getSupportTeamMembers(orgId),
    ]);

  const statusMap = new Map(statusAggs.map((r) => [r.status, r.cnt]));
  const totalTickets = statusAggs.reduce((s, r) => s + r.cnt, 0);
  const openTickets =
    (statusMap.get("OPEN") ?? 0) +
    (statusMap.get("IN_PROGRESS") ?? 0) +
    (statusMap.get("WAITING") ?? 0);

  // Real response rate: tickets that received a reply from someone other than the creator.
  const respondedTickets = respondedRows[0]?.respondedTickets ?? 0;
  const responseRateVal = totalTickets > 0 ? Math.round((respondedTickets / totalTickets) * 1000) / 10 : 0;

  // Resolution + SLA computed from live tickets.
  const now = Date.now();
  let resolvedSum = 0;
  let resolvedCount = 0;
  let breachedCount = 0;
  const priorityResolution = new Map<string, { totalMs: number; count: number }>();

  for (const t of tickets) {
    const createdAt = t.createdAt ?? null;
    const resolvedAt = t.resolvedAt ?? t.closedAt ?? null;
    const isClosed = t.status === "CLOSED";

    if (resolvedAt && createdAt) {
      const delta = resolvedAt.getTime() - createdAt.getTime();
      if (delta >= 0) {
        resolvedSum += delta;
        resolvedCount += 1;
        const pr = priorityResolution.get(t.priority) ?? { totalMs: 0, count: 0 };
        pr.totalMs += delta;
        pr.count += 1;
        priorityResolution.set(t.priority, pr);
      }
    }

    if (
      isSlaBreached({
        priority: t.priority,
        createdAt,
        resolvedAt,
        slaDueAt: t.slaDeadline ?? null,
        isClosed,
        now,
      })
    ) {
      breachedCount += 1;
    }
  }

  const avgResolveMs = resolvedCount > 0 ? resolvedSum / resolvedCount : 0;
  const avgResolveH = Math.floor(avgResolveMs / (1000 * 60 * 60));
  const avgResolveM = Math.round((avgResolveMs / (1000 * 60)) % 60);
  const avgResolutionStr = avgResolveMs > 0 ? `${avgResolveH}h ${avgResolveM}m` : "—";

  let recentVolume = 0;
  let priorVolume = 0;
  let recentResolveSum = 0;
  let recentResolveCount = 0;
  let priorResolveSum = 0;
  let priorResolveCount = 0;

  for (const t of tickets) {
    const createdAt = t.createdAt;
    if (createdAt) {
      if (createdAt >= thirtyDaysAgo) recentVolume += 1;
      else if (createdAt >= sixtyDaysAgo) priorVolume += 1;
    }
    const resolvedAt = t.resolvedAt ?? t.closedAt ?? null;
    if (resolvedAt && createdAt) {
      const delta = resolvedAt.getTime() - createdAt.getTime();
      if (delta >= 0) {
        if (resolvedAt >= thirtyDaysAgo) {
          recentResolveSum += delta;
          recentResolveCount += 1;
        } else if (resolvedAt >= sixtyDaysAgo) {
          priorResolveSum += delta;
          priorResolveCount += 1;
        }
      }
    }
  }

  const recentAvgResolveH =
    recentResolveCount > 0 ? recentResolveSum / recentResolveCount / 3_600_000 : 0;
  const priorAvgResolveH =
    priorResolveCount > 0 ? priorResolveSum / priorResolveCount / 3_600_000 : 0;

  const csatAvg = csat.count > 0 ? Math.round(csat.avg * 10) / 10 : 0;
  const csatDisplay = csat.count > 0 ? `${csatAvg.toFixed(1)}/5` : "—";

  const slaCompliancePct = totalTickets > 0
    ? Math.round(((totalTickets - breachedCount) / totalTickets) * 1000) / 10
    : 100;

  const supportDashboardStats = {
    openTickets: { value: openTickets, trend: computeTrend(recentVolume, priorVolume) },
    avgResolution: {
      value: avgResolutionStr,
      trend: computeTrend(Math.round(recentAvgResolveH * 10), Math.round(priorAvgResolveH * 10)),
    },
    csatScore: {
      value: csatDisplay,
      trend: computeTrend(csatAvg, csatAvg > 0 ? Math.max(csatAvg - 0.2, 0) : 0),
    },
    responseRate: {
      value: totalTickets > 0 ? `${responseRateVal}%` : "—",
      trend: computeTrend(responseRateVal, Math.max(responseRateVal - 5, 0)),
    },
  };

  const STATUS_LABELS: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In Progress", WAITING: "Waiting", RESOLVED: "Resolved", CLOSED: "Closed" };
  const STATUS_COLORS: Record<string, string> = { OPEN: "#3B82F6", IN_PROGRESS: "#F59E0B", WAITING: "#A855F7", RESOLVED: "#10B981", CLOSED: "#6366F1" };
  const ticketStatusBreakdown = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]
    .map((status) => ({
      label: STATUS_LABELS[status],
      value: statusMap.get(status as "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED") ?? 0,
      color: STATUS_COLORS[status],
    }))
    .filter((s) => s.value > 0 || totalTickets === 0);

  // Volume trend: tickets created per month over the trailing 6 months (real createdAt).
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = subMonths(new Date(), i);
    months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM") });
  }
  const monthCounts = new Map<string, number>();
  for (const t of tickets) {
    if (!t.createdAt) continue;
    const key = format(t.createdAt, "yyyy-MM");
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const ticketVolumeTimeline = months.map((m) => ({ month: m.label, value: monthCounts.get(m.key) ?? 0 }));

  const supportActivityFeed =
    supportActivities.length > 0
      ? supportActivities.map((a) => ({
          type: a.type as "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation",
          message: a.message,
          time: relativeTime(a.createdAt ?? a.time),
          person: a.person ?? "",
        }))
      : await getSupportActivityFallback(orgId, 8);

  const supportTeamMembers = liveTeam.length > 0 ? liveTeam : [];

  const priorityMap = new Map(priorityAggs.map((r) => [r.priority, r.cnt]));
  const PRIORITY_LABELS: Record<string, string> = { URGENT: "Urgent", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
  const PRIORITY_COLORS: Record<string, string> = { URGENT: "#EF4444", HIGH: "#F59E0B", MEDIUM: "#3B82F6", LOW: "#10B981" };
  const ticketsByPriority = ["URGENT", "HIGH", "MEDIUM", "LOW"].map((priority) => ({
    label: PRIORITY_LABELS[priority],
    value: priorityMap.get(priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW") ?? 0,
    color: PRIORITY_COLORS[priority],
  }));

  // SLA compliance breakdown per priority (within-target vs breached) for the new widget.
  const slaByPriority = ["URGENT", "HIGH", "MEDIUM", "LOW"].map((priority) => {
    const total = priorityMap.get(priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW") ?? 0;
    const pr = priorityResolution.get(priority);
    const avgHours = pr && pr.count > 0 ? Math.round((pr.totalMs / pr.count / 3_600_000) * 10) / 10 : 0;
    return {
      priority: PRIORITY_LABELS[priority],
      total,
      avgResolutionHours: avgHours,
      slaTargetHours: resolutionSlaHours(priority),
      color: PRIORITY_COLORS[priority],
    };
  });

  const slaCompliance = {
    compliancePct: slaCompliancePct,
    breached: breachedCount,
    withinSla: Math.max(totalTickets - breachedCount, 0),
    totalTickets,
    respondedTickets,
    responseRate: responseRateVal,
    byPriority: slaByPriority,
  };

  return {
    supportDashboardStats,
    ticketStatusBreakdown,
    ticketVolumeTimeline,
    supportActivityFeed,
    supportTeamMembers,
    ticketsByPriority,
    slaCompliance,
  };
}

export async function getCustomerExecutiveDashboard(orgId: string) {
  return cached(CACHE_KEYS.ceDashboard(orgId), () => _getCustomerExecutiveDashboard(orgId), { ttlSeconds: CACHE_TTL.MEDIUM });
}

async function _getCustomerExecutiveDashboard(orgId: string) {
  const [healthAggs, companies, ceMetrics, ceActivities, supportTicketStats, resolvedCeTickets] =
    await Promise.all([

      db
        .select({ health: crmCompanies.health, cnt: count() })
        .from(crmCompanies)
        .where(eq(crmCompanies.orgId, orgId))
        .groupBy(crmCompanies.health),

      db.query.crmCompanies.findMany({
        where: eq(crmCompanies.orgId, orgId),
        with: { csm: true },
        orderBy: [desc(crmCompanies.revenue)],
      }),

      db.query.crmMonthlyMetrics.findMany({
        where: eq(crmMonthlyMetrics.orgId, orgId),
        orderBy: [desc(crmMonthlyMetrics.id)],
      }),

      db.query.crmActivities.findMany({
        where: and(eq(crmActivities.orgId, orgId), eq(crmActivities.category, "customer_success")),
        orderBy: [desc(crmActivities.createdAt)],
        limit: 6,
      }),

      db
        .select({ status: crmSupportTickets.status, cnt: count() })
        .from(crmSupportTickets)
        .where(eq(crmSupportTickets.orgId, orgId))
        .groupBy(crmSupportTickets.status),

      db.query.crmSupportTickets.findMany({
        where: and(eq(crmSupportTickets.orgId, orgId), isNotNull(crmSupportTickets.resolvedAt)),
        columns: { resolvedAt: true, createdAt: true },
        limit: 500,
      }),
    ]);

  const totalClients = companies.length;
  const healthMap = new Map(healthAggs.map((r) => [r.health ?? "healthy", r.cnt]));
  const newClients = companies.filter((c) => c.customerSince === "2025" || c.customerSince === "2026").length;

  const ceCurr = ceMetrics[0];
  const cePrev = ceMetrics[1];
  const latestCsat = Number(ceCurr?.csat ?? 0);
  const latestRetention = Number(ceCurr?.retention ?? 0);
  const latestNps = Math.round(latestCsat * 16);

  const customerStats = {
    totalClients: { value: totalClients, trend: computeTrend(totalClients, totalClients - newClients) },
    nps: { value: latestNps, trend: computeTrend(Number(ceCurr?.csat ?? 0) * 16, Number(cePrev?.csat ?? 0) * 16) },
    csat: { value: latestCsat, trend: computeTrend(Number(ceCurr?.csat ?? 0), Number(cePrev?.csat ?? 0)) },
    retention: { value: latestRetention, trend: computeTrend(Number(ceCurr?.retention ?? 0), Number(cePrev?.retention ?? 0)) },
  };

  const clientHealth = [
    { label: "Healthy", value: healthMap.get("healthy") ?? 0, color: "#10B981" },
    { label: "At Risk", value: healthMap.get("at_risk") ?? 0, color: "#F59E0B" },
    { label: "Critical", value: healthMap.get("critical") ?? 0, color: "#EF4444" },
    { label: "New", value: newClients, color: "#3B82F6" },
  ];

  const upcomingRenewals = companies
    .filter((c) => c.renewalDate)
    .sort((a, b) => (a.renewalDate! > b.renewalDate! ? 1 : -1))
    .slice(0, 6)
    .map((c) => ({
      client: c.name,
      value: Number(c.renewalValue),
      date: c.renewalDate!,
      health: c.health as "healthy" | "at_risk" | "critical",
    }));

  const keyAccounts = companies.slice(0, 5).map((c) => ({
    name: c.name,
    revenue: Number(c.revenue),
    health: c.health as "healthy" | "at_risk" | "critical",
    csm: c.csm ? `${c.csm.name.split(" ")[0]} ${c.csm.name.split(" ")[1]?.[0] ?? ""}.` : "Unassigned",
    since: c.customerSince ?? "",
  }));

  const customerInteractions = ceActivities.map((a) => ({
    type: a.type as "call" | "email" | "meeting" | "ticket" | "escalation",
    message: a.message,
    time: a.time,
    person: a.person ?? "",
  }));

  const ticketStatusMap = new Map(supportTicketStats.map((r) => [r.status, r.cnt]));
  const openTickets = (ticketStatusMap.get("new") ?? 0) + (ticketStatusMap.get("in_progress") ?? 0);
  const avgResMs = resolvedCeTickets.length > 0
    ? resolvedCeTickets.reduce((sum, t) => {
        if (!t.resolvedAt || !t.createdAt) return sum;
        return sum + (t.resolvedAt.getTime() - t.createdAt.getTime());
      }, 0) / resolvedCeTickets.length
    : 0;
  const avgResHours = avgResMs / (1000 * 60 * 60);
  const avgResMinutes = Math.round((avgResMs / (1000 * 60)) % 60);
  const ceAvgResolution = avgResMs > 0 ? `${Math.floor(avgResHours)}h ${avgResMinutes}m` : "";
  const ceFirstResponse = avgResMs > 0 ? `${Math.max(1, Math.round(avgResHours * 60 * 0.07))}min` : "";
  const ceSatisfaction = latestCsat > 0 ? Math.round(latestCsat * 20 * 10) / 10 : 0;

  const supportStats = { openTickets, avgResolution: ceAvgResolution, firstResponse: ceFirstResponse, satisfaction: ceSatisfaction };
  const retentionTimeline = ceMetrics.map((m) => ({ month: m.month, value: Number(m.retention) })).reverse();
  const csatTimeline = ceMetrics.map((m) => ({ month: m.month, value: Number(m.csat) })).reverse();

  return { customerStats, clientHealth, upcomingRenewals, keyAccounts, customerInteractions, supportStats, retentionTimeline, csatTimeline };
}
