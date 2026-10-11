"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Target, Percent } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { StatsStrip } from "@/components/shared/stats-strip";
import { toneBar } from "@/lib/design/tones";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadStats, useLeads, useLeadAnalyticsSummary, useSalesLeaderboard } from "@/lib/api/hooks/leads";
import { useAllDeals } from "@/lib/api/hooks/crm";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useTaskAnalytics } from "@/lib/api/hooks/tasks";
import { useSlaReport } from "@/lib/api/hooks/crm-settings";
import { CHART_TOOLTIP_STYLE, AXIS_TICK, CHART_AXIS, CHART_GRID, CHART_COLORS } from "@/features/crm/shared/constants";
import { PipelineFunnelChart } from "@/features/crm/analytics/pipeline-funnel-chart";
import { SourceBreakdownChart } from "@/features/crm/analytics/source-breakdown-chart";
import { RepPerformanceTable } from "@/features/crm/analytics/rep-performance-table";
import { LeadVolumeChart } from "@/features/crm/analytics/lead-volume-chart";
import { ConversionChart } from "@/features/crm/analytics/conversion-chart";
import { DealValueChart } from "@/features/crm/analytics/deal-value-chart";
import { AnalyticsChartCard } from "@/features/crm/analytics/analytics-chart-card";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

function trendHint(current: number, prev: number, relative: boolean) {
  if (prev <= 0) return undefined;
  const delta = relative ? Math.round(((current - prev) / prev) * 100) : Math.abs(current - prev);
  const up = current >= prev;
  return (
    <span className={up ? "text-success-strong" : "text-danger-strong"}>
      {up ? "▲" : "▼"} <span className="tabular-nums">{Math.abs(delta)}%</span>
      <span className="text-muted-foreground"> vs prev period</span>
    </span>
  );
}

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
  const { data: allDeals = [], isLoading: dealsLoading, isError: dealsError, error: dealsErr, refetch: refetchDeals } = useAllDeals();
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
      { name: "New", value: leadStats.byStatus.NEW, fill: "var(--chart-1)" },
      { name: "Contacted", value: leadStats.byStatus.CONTACTED, fill: "var(--chart-2)" },
      { name: "Interested", value: leadStats.byStatus.INTERESTED, fill: "var(--chart-3)" },
      { name: "Qualified", value: leadStats.byStatus.QUALIFIED, fill: "var(--chart-4)" },
      { name: "Converted", value: leadStats.byStatus.CONVERTED, fill: "var(--chart-5)" },
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

  if (!isLoading && dealsError) {
    return (
      <PageWrapper title="CRM Analytics" subtitle="Pipeline insights and performance metrics">
        <QueryErrorState title="Couldn't load deals" error={dealsErr} onRetry={() => refetchDeals()} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="CRM Analytics" subtitle="Pipeline insights and performance metrics">
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-36" /></CardHeader>
                <CardContent><Skeleton className="h-70 w-full" /></CardContent>
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
      actions={
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={handleDateRangeChange}
          placeholder="Filter by date range"
        />
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        {analyticsSummary && (
          <motion.div variants={fadeUp}>
            <StatsStrip
              items={[
                {
                  label: "Total Leads",
                  value: analyticsSummary.totalLeads,
                  icon: Users,
                  hint: trendHint(analyticsSummary.totalLeads, analyticsSummary.totalLeadsPrevPeriod, true),
                },
                {
                  label: "Conversion Rate",
                  value: `${analyticsSummary.conversionRate}%`,
                  icon: Percent,
                  hint: trendHint(analyticsSummary.conversionRate, analyticsSummary.conversionRatePrevPeriod, false),
                },
                { label: "Total Revenue", value: `${CURRENCY_SYMBOL}${(analyticsSummary.totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign },
                { label: "Active Reps", value: analyticsSummary.assignmentDistribution.length, icon: Target },
              ]}
            />
          </motion.div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <PipelineFunnelChart data={funnelData} />
          <LeadVolumeChart data={leadVolumeTrend} />
          <SourceBreakdownChart data={sourceBreakdown} />
          <ConversionChart data={wonLostReasons} />
          <DealValueChart data={dealsByStageValue} />

          <AnalyticsChartCard title="SLA Compliance Rate" data={[]} filename="sla-compliance">
            {slaReport && (
              <div className="flex h-70 flex-col items-center justify-center">
                <div className="relative h-40 w-40">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={slaReport.complianceRate >= 80 ? "var(--success-500)" : slaReport.complianceRate >= 50 ? "var(--warning-500)" : "var(--danger-500)"}
                      strokeWidth="8"
                      strokeDasharray={`${slaReport.complianceRate * 2.64} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-extrabold tabular-nums">{slaReport.complianceRate}%</span>
                    <span className="text-xs text-muted-foreground">Compliant</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs tabular-nums">
                  <span className="text-muted-foreground">Total: {slaReport.total}</span>
                  <span className="text-success-strong">Met: {slaReport.compliant}</span>
                  <span className="text-danger-strong">Breached: {slaReport.breached}</span>
                </div>
              </div>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Score Distribution" data={scoreDistribution} filename="score-distribution">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="range" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {scoreDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartCard>

          {analyticsSummary && analyticsSummary.assignmentDistribution.length > 0 && (
            <AnalyticsChartCard title="Lead Assignment Distribution" data={analyticsSummary.assignmentDistribution as unknown as Record<string, unknown>[]} filename="assignment-distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analyticsSummary.assignmentDistribution} layout="vertical">
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis type="number" {...CHART_AXIS} />
                  <YAxis dataKey="name" type="category" {...CHART_AXIS} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}

          {analyticsSummary && analyticsSummary.conversionBySource.length > 0 && (
            <AnalyticsChartCard title="Conversion Rate by Source" data={analyticsSummary.conversionBySource as unknown as Record<string, unknown>[]} filename="conversion-by-source">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analyticsSummary.conversionBySource}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="source" {...CHART_AXIS} tick={{ ...AXIS_TICK, fontSize: 10 }} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="total" name="Total" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="converted" name="Converted" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
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
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="month" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${CURRENCY_SYMBOL}${(Number(value) / 100000).toFixed(1)}L`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}
        </div>

        <RepPerformanceTable leaderboard={leaderboard} />

      {taskAnalytics && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="border-b">
              <h3 className="text-sm font-semibold">Task Analytics (Last 30 Days)</h3>
            </CardHeader>
            <CardContent className="p-5">
              <dl className="mb-5 grid grid-cols-3 divide-x divide-border text-center">
                <div>
                  <dd className="font-display text-2xl font-bold tabular-nums">{taskAnalytics.completionRate}%</dd>
                  <dt className="text-xs text-muted-foreground">Completion Rate</dt>
                </div>
                <div>
                  <dd className="font-display text-2xl font-bold tabular-nums text-danger-strong">{taskAnalytics.overdue}</dd>
                  <dt className="text-xs text-muted-foreground">Overdue</dt>
                </div>
                <div>
                  <dd className="font-display text-2xl font-bold tabular-nums">{taskAnalytics.total}</dd>
                  <dt className="text-xs text-muted-foreground">Total Tasks</dt>
                </div>
              </dl>
              {taskAnalytics.perRep.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Per Rep</p>
                  {taskAnalytics.perRep.slice(0, 8).map((rep) => (
                    <div key={rep.assigneeId} className="flex items-center gap-3">
                      <p className="w-24 shrink-0 truncate text-xs font-medium sm:w-32" title={rep.name}>{rep.name}</p>
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={rep.completionRate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${rep.name} task completion`}
                      >
                        <div
                          className={cn("h-full rounded-full", toneBar.brand)}
                          style={{ width: `${rep.completionRate}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums">{rep.completionRate}%</span>
                      <span className="hidden w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:inline">
                        {rep.completed}/{rep.total}
                      </span>
                      {rep.overdue > 0 && (
                        <span className="shrink-0 text-2xs tabular-nums text-danger-strong">{rep.overdue} late</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      </motion.div>
    </PageWrapper>
  );
}
