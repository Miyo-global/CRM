"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Target, Percent } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadStats, useLeads, useLeadAnalyticsSummary, useSalesLeaderboard } from "@/lib/api/hooks/leads";
import { useDeals } from "@/lib/api/hooks/crm";
import { useTaskAnalytics } from "@/lib/api/hooks/tasks";
import { useSlaReport } from "@/lib/api/hooks/crm-settings";
import { CHART_TOOLTIP_STYLE, AXIS_TICK, CHART_COLORS } from "@/features/crm/shared/constants";
import { PipelineFunnelChart } from "@/features/crm/analytics/pipeline-funnel-chart";
import { SourceBreakdownChart } from "@/features/crm/analytics/source-breakdown-chart";
import { RepPerformanceTable } from "@/features/crm/analytics/rep-performance-table";
import { LeadVolumeChart } from "@/features/crm/analytics/lead-volume-chart";
import { ConversionChart } from "@/features/crm/analytics/conversion-chart";
import { DealValueChart } from "@/features/crm/analytics/deal-value-chart";
import { AnalyticsChartCard } from "@/features/crm/analytics/analytics-chart-card";

export default function CrmAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleDateRangeChange = useCallback((range: { from: string; to: string }) => {
    setDateFrom(range.from);
    setDateTo(range.to);
  }, []);

  const { data: leadStats, isLoading: statsLoading } = useLeadStats({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: dealsResult, isLoading: dealsLoading } = useDeals({ limit: 500 });
  const allDeals = dealsResult?.data ?? [];
  const { data: leaderboard, isLoading: leaderLoading } = useSalesLeaderboard();
  const { data: slaReport, isLoading: slaLoading } = useSlaReport();
  const { data: allLeadsResult, isLoading: leadsLoading } = useLeads({ limit: 100 });
  const allLeads = allLeadsResult?.leads;
  const { data: taskAnalytics } = useTaskAnalytics(30);

  const { data: analyticsSummary, isLoading: summaryLoading } = useLeadAnalyticsSummary({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const isLoading = statsLoading || dealsLoading || leaderLoading || slaLoading || leadsLoading || summaryLoading;

  const funnelData = useMemo(() => {
    if (!leadStats) return [];
    return [
      { name: "New", value: leadStats.byStatus.NEW, fill: "#3B82F6" },
      { name: "Contacted", value: leadStats.byStatus.CONTACTED, fill: "#0EA5E9" },
      { name: "Interested", value: leadStats.byStatus.INTERESTED, fill: "#F59E0B" },
      { name: "Qualified", value: leadStats.byStatus.QUALIFIED, fill: "#8B5CF6" },
      { name: "Converted", value: leadStats.byStatus.CONVERTED, fill: "#10B981" },
    ].filter((s) => s.value > 0);
  }, [leadStats]);

  const leadVolumeTrend = useMemo(() => {
    if (!allLeads) return [];
    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      weeks[`W${12 - i}`] = 0;
    }
    allLeads.forEach((lead) => {
      const diffDays = Math.floor((now.getTime() - new Date(lead.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex < 12) {
        const key = `W${12 - weekIndex}`;
        if (weeks[key] !== undefined) weeks[key]++;
      }
    });
    return Object.entries(weeks).map(([week, leads]) => ({ week, leads }));
  }, [allLeads]);

  const sourceBreakdown = useMemo(() => {
    if (!allLeads) return [];
    const map: Record<string, number> = {};
    allLeads.forEach((l) => {
      const src = l.source?.replace("_", " ") ?? "unknown";
      map[src] = (map[src] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  const dealsByStageValue = useMemo(() => {
    if (!allDeals) return [];
    const map: Record<string, number> = {};
    allDeals.forEach((d) => { map[d.stage] = (map[d.stage] ?? 0) + Number(d.value ?? 0); });
    return Object.entries(map).map(([stage, value]) => ({ stage, value: Math.round(value / 100000) }));
  }, [allDeals]);

  const wonLostReasons = useMemo(() => {
    if (!allDeals) return [];
    const won = allDeals.filter((d) => d.stage === "WON").length;
    const lost = allDeals.filter((d) => d.stage === "LOST").length;
    const data = [];
    if (won > 0) data.push({ name: "Won", value: won });
    if (lost > 0) data.push({ name: "Lost", value: lost });
    return data;
  }, [allDeals]);

  const scoreDistribution = useMemo(() => {
    if (!allLeads) return [];
    const buckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    allLeads.forEach((l) => {
      const score = (l as unknown as Record<string, unknown>).score as number | null ?? 0;
      if (score <= 20) buckets["0-20"]++;
      else if (score <= 40) buckets["21-40"]++;
      else if (score <= 60) buckets["41-60"]++;
      else if (score <= 80) buckets["61-80"]++;
      else buckets["81-100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [allLeads]);

  if (isLoading) {
    return (
      <PageWrapper title="CRM Analytics" subtitle="Pipeline insights and performance metrics">
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-2"><Skeleton className="h-4 w-36" /></CardHeader>
                <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="CRM Analytics"
      subtitle="Pipeline insights and performance metrics"
      filters={
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={handleDateRangeChange}
          placeholder="Filter by date range"
        />
      }
    >
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        {analyticsSummary && (
          <motion.div variants={fadeUp} className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Leads" value={analyticsSummary.totalLeads} icon={Users} index={0}
              trend={analyticsSummary.totalLeadsPrevPeriod > 0 ? {
                value: Math.round(((analyticsSummary.totalLeads - analyticsSummary.totalLeadsPrevPeriod) / analyticsSummary.totalLeadsPrevPeriod) * 100),
                isPositive: analyticsSummary.totalLeads >= analyticsSummary.totalLeadsPrevPeriod,
              } : undefined}
            />
            <StatCard
              label="Conversion Rate" value={`${analyticsSummary.conversionRate}%`} icon={Percent} index={1}
              trend={analyticsSummary.conversionRatePrevPeriod > 0 ? {
                value: Math.abs(analyticsSummary.conversionRate - analyticsSummary.conversionRatePrevPeriod),
                isPositive: analyticsSummary.conversionRate >= analyticsSummary.conversionRatePrevPeriod,
              } : undefined}
            />
            <StatCard label="Total Revenue" value={`₹${(analyticsSummary.totalRevenue / 100000).toFixed(1)}L`} icon={DollarSign} index={2} />
            <StatCard label="Active Reps" value={analyticsSummary.assignmentDistribution.length} icon={Target} index={3} />
          </motion.div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <PipelineFunnelChart data={funnelData} />
          <LeadVolumeChart data={leadVolumeTrend} />
          <SourceBreakdownChart data={sourceBreakdown} />
          <RepPerformanceTable leaderboard={leaderboard} />
          <ConversionChart data={wonLostReasons} />
          <DealValueChart data={dealsByStageValue} />

          <AnalyticsChartCard title="SLA Compliance Rate" data={[]} filename="sla-compliance">
            {slaReport && (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <div className="relative h-40 w-40">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={slaReport.complianceRate >= 80 ? "#10B981" : slaReport.complianceRate >= 50 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="8"
                      strokeDasharray={`${slaReport.complianceRate * 2.64} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{slaReport.complianceRate}%</span>
                    <span className="text-xs text-muted-foreground">Compliant</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 text-xs">
                  <span className="text-muted-foreground">Total: {slaReport.total}</span>
                  <span className="text-emerald-400">Met: {slaReport.compliant}</span>
                  <span className="text-red-400">Breached: {slaReport.breached}</span>
                </div>
              </div>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Score Distribution" data={scoreDistribution} filename="score-distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartCard>

          {analyticsSummary && analyticsSummary.assignmentDistribution.length > 0 && (
            <AnalyticsChartCard title="Lead Assignment Distribution" data={analyticsSummary.assignmentDistribution as unknown as Record<string, unknown>[]} filename="assignment-distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analyticsSummary.assignmentDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={AXIS_TICK} />
                  <YAxis dataKey="name" type="category" tick={AXIS_TICK} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}

          {analyticsSummary && analyticsSummary.conversionBySource.length > 0 && (
            <AnalyticsChartCard title="Conversion Rate by Source" data={analyticsSummary.conversionBySource as unknown as Record<string, unknown>[]} filename="conversion-by-source">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analyticsSummary.conversionBySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="source" tick={{ ...AXIS_TICK, fontSize: 10 }} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="total" name="Total" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Converted" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}

          {analyticsSummary && analyticsSummary.monthlyRevenue.length > 0 && (
            <AnalyticsChartCard title="Monthly Revenue Trend" data={analyticsSummary.monthlyRevenue as unknown as Record<string, unknown>[]} filename="monthly-revenue">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analyticsSummary.monthlyRevenue}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#bd882c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#bd882c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`₹${(Number(value) / 100000).toFixed(1)}L`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#bd882c" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}
        </div>
      </motion.div>

      {taskAnalytics && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">Task Analytics (Last 30 Days)</h3>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{taskAnalytics.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{taskAnalytics.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{taskAnalytics.total}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
              {taskAnalytics.perRep.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Rep</p>
                  {taskAnalytics.perRep.slice(0, 8).map((rep) => (
                    <div key={rep.assigneeId} className="flex items-center gap-3">
                      <p className="text-xs font-medium w-32 truncate shrink-0">{rep.name}</p>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${rep.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-10 text-right shrink-0">{rep.completionRate}%</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">
                        {rep.completed}/{rep.total}
                      </span>
                      {rep.overdue > 0 && (
                        <span className="text-[10px] text-destructive shrink-0">{rep.overdue} late</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageWrapper>
  );
}
