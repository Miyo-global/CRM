"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useInterviewerPerformance } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { AnalyticsChartCard } from "@/components/charts/analytics-chart-card";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP_STYLE } from "@/lib/design/chart-styles";
import { toneVar, type Tone } from "@/lib/design/tones";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function getSpeedLabel(hours: number | null): { label: string; color: string; tone?: Tone } {
  if (hours === null) return { label: "", color: "text-muted-foreground" };
  if (hours <= 24) return { label: "< 24h", color: "text-success-strong", tone: "success" };
  if (hours <= 48) return { label: `${Math.round(hours)}h`, color: "text-warning-strong", tone: "warning" };
  return { label: `${Math.round(hours)}h`, color: "text-danger-strong", tone: "danger" };
}

function SpeedBar({ hours }: { hours: number | null }) {
  if (hours === null) return null;
  const pct = Math.min((hours / 72) * 100, 100);
  const color = hours <= 24 ? "bg-success-500" : hours <= 48 ? "bg-warning-500" : "bg-danger-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-12 text-right text-xs tabular-nums", getSpeedLabel(hours).color)}>
        {getSpeedLabel(hours).label}
      </span>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

export default function InterviewerPerformancePage() {
  const [days, setDays] = useState(90);
  const { data, isLoading, isError, error, refetch } = useInterviewerPerformance(days);

  const stats = data?.stats ?? [];

  const avgSubmitTime =
    stats.length > 0
      ? stats.filter((s) => s.avgHoursToSubmit !== null).reduce((acc, s) => acc + (s.avgHoursToSubmit ?? 0), 0) /
        stats.filter((s) => s.avgHoursToSubmit !== null).length
      : null;

  const totalAssigned = stats.reduce((a, s) => a + s.totalAssigned, 0);
  const totalSubmitted = stats.reduce((a, s) => a + s.submitted, 0);
  const totalPending = stats.reduce((a, s) => a + s.pending, 0);
  const submissionRate = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;

  const chartRows = stats.map((s) => ({
    interviewer: s.interviewerName ?? s.interviewerEmail ?? "",
    submitted: s.submitted,
    pending: s.pending,
    avgHours: s.avgHoursToSubmit !== null ? Math.round(s.avgHoursToSubmit) : null,
  }));
  const chartHeight = Math.max(200, chartRows.length * 36 + 40);

  return (
    <PageWrapper
      title="Interviewer Performance"
      subtitle="Track how quickly interviewers submit scorecards after interviews"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PageBackButton fallback="/hr/recruitment/interviews" label="Back to Interviews" showIcon />
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger size="sm" className="w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
      <div className="space-y-4">
      <StatsStrip
        items={[
          {
            label: "Avg Submit Time",
            icon: Clock,
            tone: getSpeedLabel(avgSubmitTime ?? null).tone,
            value: isLoading ? <Skeleton className="h-7 w-20" /> : avgSubmitTime !== null ? `${Math.round(avgSubmitTime)}h` : "",
          },
          {
            label: "Submission Rate",
            icon: UserCheck,
            value: isLoading ? <Skeleton className="h-7 w-16" /> : `${submissionRate}%`,
          },
          {
            label: "Submitted",
            icon: TrendingUp,
            value: isLoading ? <Skeleton className="h-7 w-16" /> : totalSubmitted,
          },
          {
            label: "Pending",
            icon: AlertCircle,
            tone: !isLoading && totalPending > 0 ? "warning" : undefined,
            value: isLoading ? <Skeleton className="h-7 w-12" /> : totalPending,
          },
        ]}
      />

      {!isLoading && chartRows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsChartCard
            title="Scorecards"
            legend={
              <>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-success-500" aria-hidden="true" />
                  Submitted
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-warning-500" aria-hidden="true" />
                  Pending
                </span>
              </>
            }
            subtitle={PERIOD_OPTIONS.find((o) => o.value === String(days))?.label}
            data={chartRows}
            filename={`interviewer-scorecards-${days}d`}
            ariaLabel={chartRows.map((r) => `${r.interviewer}: ${r.submitted} submitted, ${r.pending} pending`).join(", ")}
            bodyClassName="min-h-0"
          >
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid {...CHART_GRID} horizontal={false} vertical />
                <XAxis type="number" allowDecimals={false} {...CHART_AXIS} />
                <YAxis type="category" dataKey="interviewer" width={120} {...CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="submitted" name="Submitted" stackId="s" fill={toneVar.success} maxBarSize={28} />
                <Bar dataKey="pending" name="Pending" stackId="s" fill={toneVar.warning} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartCard>
          <AnalyticsChartCard
            title="Avg Submission Time"
            subtitle={PERIOD_OPTIONS.find((o) => o.value === String(days))?.label}
            data={chartRows}
            filename={`interviewer-submit-time-${days}d`}
            ariaLabel={chartRows.map((r) => `${r.interviewer}: ${r.avgHours ?? "n/a"}h`).join(", ")}
            bodyClassName="min-h-0"
          >
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid {...CHART_GRID} horizontal={false} vertical />
                <XAxis type="number" unit="h" allowDecimals={false} {...CHART_AXIS} />
                <YAxis type="category" dataKey="interviewer" width={120} {...CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v}h`, "Avg Submission Time"]} />
                <Bar dataKey="avgHours" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartCard>
        </div>
      )}

      {!isLoading && stats.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration className="size-32" />}
          title="No scorecard data found for the selected period."
        />
      ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interviewer</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="w-52">Avg Submission Time</TableHead>
                <TableHead>Recommendations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  </TableRow>
                ))
              ) : (
                stats.map((stat) => {
                  const hireCount = stat.recommendations["HIRE"] ?? 0;
                  const noHireCount = stat.recommendations["NO_HIRE"] ?? 0;
                  const maybeCount = stat.recommendations["MAYBE"] ?? 0;
                  return (
                    <TableRow key={stat.interviewerId}>
                      <TableCell>
                        <div className="min-w-40">
                          <p className="text-sm font-medium text-foreground">{stat.interviewerName ?? ""}</p>
                          {stat.interviewerEmail && (
                            <p className="text-xs text-muted-foreground">{stat.interviewerEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{stat.totalAssigned}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-success-strong">
                        {stat.submitted}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {stat.pending > 0 ? (
                          <StatusPill tone="warning" className="tabular-nums">{stat.pending}</StatusPill>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <SpeedBar hours={stat.avgHoursToSubmit} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hireCount > 0 && (
                            <StatusPill tone="success" className="tabular-nums">HIRE ×{hireCount}</StatusPill>
                          )}
                          {maybeCount > 0 && (
                            <StatusPill tone="warning" className="tabular-nums">MAYBE ×{maybeCount}</StatusPill>
                          )}
                          {noHireCount > 0 && (
                            <StatusPill tone="danger" className="tabular-nums">NO_HIRE ×{noHireCount}</StatusPill>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      )}
      </div>
      )}
    </PageWrapper>
  );
}
