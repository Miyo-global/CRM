"use client";

import { use, useMemo, useState } from "react";
import { useProjectAnalytics, useSprints, useSprintBurndown } from "@/lib/api/hooks/projects";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip, type StatsStripItem } from "@/components/shared/stats-strip";
import { AnalyticsChartCard } from "@/features/crm/analytics/analytics-chart-card";
import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/motion-variants";
import type { Sprint, SprintBurndownPoint } from "@/types/projects";
import {
  BarChart,
  PieChart,
  AreaChart,
  Bar,
  Pie,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import { toneVar, type Tone } from "@/lib/design/tones";
import { CHART_AXIS, CHART_COLORS, CHART_GRID, CHART_TOOLTIP_STYLE } from "@/features/crm/shared/constants";

const STATE_COLORS: Record<string, string> = {
  backlog: toneVar.neutral,
  todo: toneVar.info,
  in_progress: toneVar.warning,
  in_review: toneVar.plum,
  done: toneVar.success,
  cancelled: toneVar.danger,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: toneVar.danger,
  high: toneVar.warning,
  medium: toneVar.brand,
  low: toneVar.success,
  none: toneVar.neutral,
};

const HEALTH_TONE: Record<string, Tone> = {
  EXCELLENT: "success",
  GOOD: "info",
  AT_RISK: "warning",
};

type ChartRows = Record<string, unknown>[];

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-70 items-center justify-center rounded-md bg-surface-sunken/40 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: analytics, isLoading, isError, error, refetch } = useProjectAnalytics(projectId);
  const { data: sprints } = useSprints(projectId);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const activeSprint = useMemo(() => {
    if (!sprints || sprints.length === 0) return null;
    const active = sprints.find((s: Sprint) => s.status === "ACTIVE");
    return active ?? sprints[sprints.length - 1];
  }, [sprints]);

  const sprintId = selectedSprintId ?? activeSprint?.id ?? 0;

  const { data: burndownData } = useSprintBurndown(projectId, sprintId);

  const stateData = useMemo(() => {
    if (!analytics?.stateDistribution) return [];
    return analytics.stateDistribution.map((row: { status: string | null; count: number }) => {
      const state = row.status ?? "unknown";
      return {
        state: state.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        count: row.count,
        fill: STATE_COLORS[state.toLowerCase()] ?? toneVar.neutral,
      };
    });
  }, [analytics?.stateDistribution]);

  const priorityData = useMemo(() => {
    if (!analytics?.priorityBreakdown) return [];
    return analytics.priorityBreakdown.map((row: { priority: string | null; count: number }) => {
      const priority = row.priority ?? "none";
      return {
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: row.count,
        fill: PRIORITY_COLORS[priority.toLowerCase()] ?? toneVar.neutral,
      };
    });
  }, [analytics?.priorityBreakdown]);

  const volumeData = useMemo(() => {
    if (!analytics?.volumeOverTime) return [];
    return analytics.volumeOverTime.map(
      (entry: { week: string | null; count: number }) => ({
        date: entry.week ?? "",
        created: entry.count,
      })
    );
  }, [analytics?.volumeOverTime]);

  const assigneeData = useMemo(() => {
    if (!analytics?.assigneeCompletion) return [];
    return analytics.assigneeCompletion.map(
      (entry: { assigneeId: string | null; total: number; completed: number }) => ({
        name: entry.assigneeId != null ? `User ${entry.assigneeId}` : "Unassigned",
        completed: entry.completed,
        total: entry.total,
        rate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
      })
    );
  }, [analytics?.assigneeCompletion]);

  const velocityData = useMemo(() => {
    if (!analytics?.cycleVelocity) return [];
    return analytics.cycleVelocity.map(
      (entry: { cycleId: number; cycleName: string | null; completedPoints: number }) => ({
        cycle: entry.cycleName ?? `Cycle ${entry.cycleId}`,
        points: entry.completedPoints,
      })
    );
  }, [analytics?.cycleVelocity]);

  const burndownChartData = useMemo(() => {
    if (!burndownData) return [];
    const idealMap = new Map(
      burndownData.idealBurndown.map((p: SprintBurndownPoint) => [
        typeof p.date === "string" ? p.date.slice(0, 10) : new Date(p.date).toISOString().slice(0, 10),
        p.points,
      ])
    );
    return burndownData.actualBurndown.map((p: SprintBurndownPoint) => {
      const dateKey = typeof p.date === "string" ? p.date.slice(0, 10) : new Date(p.date).toISOString().slice(0, 10);
      return {
        date: dateKey,
        remaining: Math.max(0, p.points),
        ideal: Math.max(0, idealMap.get(dateKey) ?? 0),
      };
    });
  }, [burndownData]);

  const estimateData = useMemo(() => {
    if (!analytics?.estimateVsActual) return [];
    return analytics.estimateVsActual.map(
      (entry: { ticketId: number; title: string; estimated: string | null; actual: number }) => ({
        label: entry.title || `#${entry.ticketId}`,
        estimate: entry.estimated ? parseFloat(entry.estimated) : 0,
        actual: entry.actual,
      })
    );
  }, [analytics?.estimateVsActual]);

  if (isLoading) {
    return (
      <PageWrapper title="Analytics">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_: unknown, i: number) => (
              <Skeleton key={i} className="h-80 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Analytics">
        <QueryErrorState error={error} onRetry={refetch} />
      </PageWrapper>
    );
  }

  if (!analytics) {
    return (
      <PageWrapper title="Analytics">
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-32 w-32 opacity-95" />}
          title="No data yet"
          description="Analytics will appear once your project has work items."
        />
      </PageWrapper>
    );
  }

  const healthScore = (analytics as { healthScore?: number } | undefined)?.healthScore;
  const healthStatus = (analytics as { healthStatus?: string } | undefined)?.healthStatus;
  const healthBreakdown = (analytics as { healthBreakdown?: { completionPct: number; onTimePct: number; velocityScore: number; overdueTickets: number; totalTickets: number } } | undefined)?.healthBreakdown;

  const healthTone: Tone = HEALTH_TONE[healthStatus ?? ""] ?? "danger";

  const healthItems: StatsStripItem[] =
    healthScore != null && healthBreakdown
      ? [
          { label: "Project Health Score", value: healthScore, tone: healthTone, hint: healthStatus?.replace("_", " ") },
          { label: "Completion Rate", value: `${healthBreakdown.completionPct}%`, hint: "50% weight" },
          { label: "On-Time Rate", value: `${healthBreakdown.onTimePct}%`, hint: "30% weight" },
          { label: "Velocity Score", value: `${healthBreakdown.velocityScore}%`, hint: "20% weight" },
          { label: "Overdue tickets", value: healthBreakdown.overdueTickets, tone: healthBreakdown.overdueTickets > 0 ? "danger" : undefined },
          { label: "Total tickets", value: healthBreakdown.totalTickets },
        ]
      : [];

  return (
    <PageWrapper title="Analytics">
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        {healthItems.length > 0 && <StatsStrip items={healthItems} />}

        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsChartCard title="State Distribution" data={stateData as ChartRows} filename="state-distribution">
            {stateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="state" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {stateData.map((entry: { fill: string }, index: number) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No state data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Priority Breakdown" data={priorityData as ChartRows} filename="priority-breakdown">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    stroke="var(--card)"
                    dataKey="value"
                  >
                    {priorityData.map((entry: { fill: string }, index: number) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No priority data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Volume Over Time" data={volumeData as ChartRows} filename="volume-over-time">
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={volumeData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="date" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="var(--chart-1)"
                    fill="url(#volumeGrad)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Created"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No volume data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Completion Rate by Assignee" data={assigneeData as ChartRows} filename="assignee-completion">
            {assigneeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={assigneeData} layout="vertical">
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis type="number" {...CHART_AXIS} domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" {...CHART_AXIS} width={100} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={((value: string | number) => [`${value}%`, "Completion Rate"]) as never}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {assigneeData.map((_: unknown, index: number) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No assignee data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Cycle Velocity" data={velocityData as ChartRows} filename="cycle-velocity">
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={velocityData}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="cycle" {...CHART_AXIS} />
                  <YAxis {...CHART_AXIS} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="points" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} name="Completed Points" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No velocity data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard title="Estimate vs Actual" data={estimateData as ChartRows} filename="estimate-vs-actual">
            {estimateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis
                    dataKey="estimate"
                    name="Estimate"
                    {...CHART_AXIS}
                    label={{ value: "Estimate", position: "bottom", fill: "var(--chart-axis)", fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="actual"
                    name="Actual"
                    {...CHART_AXIS}
                    label={{ value: "Actual", angle: -90, position: "insideLeft", fill: "var(--chart-axis)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={((value: string | number, name: string) => [value, name]) as never}
                  />
                  <Scatter data={estimateData} fill="var(--chart-1)" shape="circle">
                    {estimateData.map((_: unknown, index: number) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No estimate data available</ChartEmpty>
            )}
          </AnalyticsChartCard>

          <div className="lg:col-span-2">
            <AnalyticsChartCard
              title="Sprint Burndown"
              data={burndownChartData as ChartRows}
              filename="sprint-burndown"
              actions={
                sprints && sprints.length > 0 ? (
                  <select
                    className="h-8 max-w-48 truncate rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:focus-ring"
                    value={sprintId}
                    onChange={(e) => setSelectedSprintId(Number(e.target.value))}
                    aria-label="Select sprint for burndown chart"
                  >
                    {sprints.map((s: Sprint) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.status === "ACTIVE" ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                ) : undefined
              }
            >
              {burndownChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={burndownChartData}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" {...CHART_AXIS} />
                    <YAxis {...CHART_AXIS} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ideal"
                      stroke="var(--chart-2)"
                      fill="transparent"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                      name="Ideal"
                    />
                    <defs>
                      <linearGradient id="remainingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      stroke="var(--chart-1)"
                      fill="url(#remainingGrad)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Remaining"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>
                  {sprints && sprints.length === 0
                    ? "No sprints found for this project"
                    : "No burndown data available for this sprint"}
                </ChartEmpty>
              )}
            </AnalyticsChartCard>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
