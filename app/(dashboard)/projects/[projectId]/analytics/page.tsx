"use client";

import { use, useMemo, useState } from "react";
import { useProjectAnalytics, useSprints, useSprintBurndown } from "@/lib/api/hooks/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
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

const STATE_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#60a5fa",
  in_progress: "#facc15",
  in_review: "#a78bfa",
  done: "#4ade80",
  cancelled: "#f87171",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
};

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: analytics, isLoading } = useProjectAnalytics(projectId);
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
        fill: STATE_COLORS[state.toLowerCase()] ?? "#94a3b8",
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
        fill: PRIORITY_COLORS[priority.toLowerCase()] ?? "#94a3b8",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_: unknown, i: number) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
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

  const healthColor =
    healthStatus === "EXCELLENT" ? "text-emerald-500"
    : healthStatus === "GOOD" ? "text-blue-500"
    : healthStatus === "AT_RISK" ? "text-amber-500"
    : "text-destructive";

  return (
    <PageWrapper title="Analytics">
      {healthScore != null && healthBreakdown && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Health Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-8">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className={`text-5xl font-bold tabular-nums ${healthColor}`}>{healthScore}</p>
                <p className={`text-sm font-medium mt-1 ${healthColor}`}>{healthStatus?.replace("_", " ")}</p>
              </div>
              <div className="flex-1 space-y-3 min-w-48">
                {[
                  { label: "Completion Rate", value: healthBreakdown.completionPct, weight: "50%" },
                  { label: "On-Time Rate", value: healthBreakdown.onTimePct, weight: "30%" },
                  { label: "Velocity Score", value: healthBreakdown.velocityScore, weight: "20%" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label} <span className="opacity-60">({item.weight} weight)</span></span>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">{healthBreakdown.overdueTickets}</span> overdue tickets</p>
                <p><span className="font-medium text-foreground">{healthBreakdown.totalTickets}</span> total tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">State Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {stateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stateData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="state"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stateData.map((entry: { fill: string }, index: number) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No state data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
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
                      dataKey="value"
                    >
                      {priorityData.map((entry: { fill: string }, index: number) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {volumeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="created"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name="Created"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No volume data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion Rate by Assignee</CardTitle>
            </CardHeader>
            <CardContent>
              {assigneeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={assigneeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      domain={[0, 100]}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={((value: string | number) => [`${value}%`, "Completion Rate"]) as never}
                    />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {assigneeData.map((_: unknown, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No assignee data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cycle Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              {velocityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="cycle"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="points"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      name="Completed Points"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No velocity data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">Sprint Burndown</CardTitle>
                {sprints && sprints.length > 0 && (
                  <select
                    className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
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
                )}
              </div>
            </CardHeader>
            <CardContent>
              {burndownChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={burndownChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ideal"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.08}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Ideal"
                    />
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      name="Remaining"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  {sprints && sprints.length === 0
                    ? "No sprints found for this project"
                    : "No burndown data available for this sprint"}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimate vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              {estimateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="estimate"
                      name="Estimate"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      label={{
                        value: "Estimate",
                        position: "bottom",
                        className: "fill-muted-foreground",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      dataKey="actual"
                      name="Actual"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                      label={{
                        value: "Actual",
                        angle: -90,
                        position: "insideLeft",
                        className: "fill-muted-foreground",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={((value: string | number, name: string) => [value, name]) as never}
                    />
                    <Scatter
                      data={estimateData}
                      fill="#f43f5e"
                      shape="circle"
                    >
                      {estimateData.map((_: unknown, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No estimate data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </PageWrapper>
  );
}
