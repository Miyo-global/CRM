"server-only";

import { db } from "@/lib/db";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { crmActivities, supportTickets, supportTicketMessages } from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
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
