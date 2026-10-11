"use client";

import { useRecruitmentStats, useJobPostings, useInterviews } from "@/lib/api/hooks/hr";
import { useRecruitmentAnalytics } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { Briefcase, Users, Calendar, UserCheck, Filter, PieChart as PieChartIcon, Clock, BarChart3, UserPlus } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { CHART_VARS, toneBar, type Tone } from "@/lib/design/tones";
import { CHART_TOOLTIP_STYLE } from "@/features/crm/shared/constants";
import { cn } from "@/lib/utils";

const PIE_COLORS = CHART_VARS;

const RESULT_TONE: Record<string, Tone> = {
  PENDING: "warning",
  PASSED: "success",
  FAILED: "danger",
  NO_SHOW: "neutral",
};

const FUNNEL_TONE: Record<string, Tone> = { HIRED: "success", REJECTED: "danger" };

function SourcePieChart({ sources }: { sources: { source: string; count: number }[] }) {
  const data = sources.map((s) => ({ name: s.source, value: s.count }));
  return (
    <div role="img" aria-label={`Candidate sources: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={64}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--card)"
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function RecruitmentDashboardPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorObj, refetch: refetchStats } = useRecruitmentStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobPostings({ status: "OPEN" });
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useInterviews({ upcoming: true });
  const { data: analytics } = useRecruitmentAnalytics();

  const isLoading = statsLoading || jobsLoading || interviewsLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Recruitment" subtitle="Hire the best talent for your team">
        <div className="space-y-6" aria-busy="true">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gap-3 p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-12" />
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-11 w-full" />)}
              </Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (statsError) {
    return (
      <PageWrapper title="Recruitment" subtitle="Hire the best talent for your team">
        <QueryErrorState error={statsErrorObj} onRetry={() => refetchStats()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruitment"
      subtitle="Hire the best talent for your team"
      actions={
        <div className="flex flex-wrap gap-2">
          <PageBackButton fallback="/hr" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/candidates">Candidates</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/pipeline">Kanban</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/jobs">Jobs</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/question-bank">Question Bank</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/hiring-flows">Hiring Flows</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {([
            { label: "Total Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase, tone: "neutral" },
            { label: "Open Positions", value: stats?.openJobs ?? 0, icon: Briefcase, tone: "brand" },
            { label: "Total Candidates", value: stats?.totalCandidates ?? 0, icon: Users, tone: "info" },
            { label: "New Candidates", value: stats?.newCandidates ?? 0, icon: UserPlus, tone: "teal" },
            { label: "Upcoming Interviews", value: stats?.upcomingInterviews ?? 0, icon: Calendar, tone: "plum" },
            { label: "Hired (Month)", value: stats?.hiredThisMonth ?? 0, icon: UserCheck, tone: "success" },
          ] as const).map(({ label, value, icon, tone }, i) => (
            <StatCard key={label} label={label} value={value} icon={icon} tone={tone} index={i} />
          ))}
        </div>

        {stats && (stats.funnel || stats.sources?.length > 0) && (
          <div className="grid grid-cols-12 gap-4 xl:gap-6">
            <WidgetCard title="Hiring Funnel" icon={Filter} className="col-span-12 md:col-span-6 xl:col-span-5">
              <div className="space-y-2.5">
                {["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"].map((stage) => {
                  const cnt = stats.funnel[stage] ?? 0;
                  const max = Math.max(...Object.values(stats.funnel), 1);
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-2xs font-medium uppercase tracking-wider text-muted-foreground">{stage}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", toneBar[FUNNEL_TONE[stage] ?? "brand"])}
                          style={{ width: `${Math.max(2, (cnt / max) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium tabular-nums">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </WidgetCard>
            <WidgetCard title="Candidate Sources" icon={PieChartIcon} tone="info" className="col-span-12 md:col-span-6 xl:col-span-4">
              {stats.sources.length > 0 ? (
                <SourcePieChart sources={stats.sources} />
              ) : (
                <EmptyState
                  compact
                  icon={Users}
                  title="No source data yet"
                  description="Candidate sources will appear here as applicants come in."
                  className="border-0 bg-transparent"
                />
              )}
            </WidgetCard>
            <div className="col-span-12 xl:col-span-3">
              <StatCard label="Avg. Days to Hire" value={stats.avgTimeToHireDays} icon={Clock} tone="warning" />
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:gap-6">
          <WidgetCard
            title="Open Positions"
            icon={Briefcase}
            count={recentJobs?.length}
            viewAllHref="/hr/recruitment/jobs"
          >
            {!recentJobs?.length ? (
              <EmptyState
                compact
                icon={Briefcase}
                title="No open positions yet"
                description="Open job postings will show up here once you publish them."
                className="border-0 bg-transparent"
              />
            ) : (
              <div className="-mx-2 max-h-72 overflow-y-auto">
                {recentJobs.map((job) => (
                  <WidgetListRow
                    key={job.id}
                    href={`/hr/recruitment/jobs/${job.id}/edit`}
                    title={job.title}
                    meta={<>{job.location ?? "Remote"} &middot; {job.type}</>}
                    trailing={
                      <Badge variant="secondary" className="tabular-nums">
                        {job.openings} opening{(job.openings ?? 1) > 1 ? "s" : ""}
                      </Badge>
                    }
                  />
                ))}
              </div>
            )}
          </WidgetCard>

          <WidgetCard
            title="Upcoming Interviews"
            icon={Calendar}
            tone="plum"
            count={upcomingInterviews?.length}
            viewAllHref="/hr/recruitment/interviews"
          >
            {!upcomingInterviews?.length ? (
              <EmptyState
                compact
                icon={Calendar}
                title="No upcoming interviews"
                description="Scheduled interviews will appear here."
                className="border-0 bg-transparent"
              />
            ) : (
              <div className="-mx-2">
                {upcomingInterviews.slice(0, 5).map((interview) => {
                  const when = new Date(interview.scheduledAt);
                  return (
                    <WidgetListRow
                      key={interview.id}
                      title={<>{interview.candidate?.firstName} {interview.candidate?.lastName}</>}
                      meta={
                        <>
                          {interview.type} &middot;{" "}
                          <time dateTime={when.toISOString()} title={format(when, "PPpp")}>
                            {formatDistanceToNow(when, { addSuffix: true })}
                          </time>
                        </>
                      }
                      trailing={
                        <StatusPill tone={RESULT_TONE[interview.result ?? "PENDING"] ?? "neutral"} dot>
                          {interview.result}
                        </StatusPill>
                      }
                    />
                  );
                })}
              </div>
            )}
          </WidgetCard>
        </div>

        {analytics && analytics.funnel.some((s) => s.count > 0) && (
          <WidgetCard title="Pipeline Funnel" icon={BarChart3} tone="info">
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {analytics.funnel.map((stage) => {
                const maxCount = Math.max(...analytics.funnel.map((s) => s.count), 1);
                const heightPct = Math.max((stage.count / maxCount) * 100, 4);
                return (
                  <div key={stage.stage} className="flex min-w-16 flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-semibold tabular-nums">{stage.count}</span>
                    <div
                      className={cn("w-full max-w-16 rounded-t-sm", toneBar.brand)}
                      style={{ height: `${heightPct * 0.6}px`, minHeight: 4 }}
                    />
                    <span className="text-center text-2xs leading-tight text-muted-foreground">{stage.stage}</span>
                    {stage.avgDaysInStage !== null && (
                      <span className="text-2xs tabular-nums text-muted-foreground">{stage.avgDaysInStage}d avg</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Hire Rate: <span className="font-semibold tabular-nums text-foreground">{analytics.hireRate}%</span></span>
              <span>Total: <span className="font-semibold tabular-nums text-foreground">{analytics.totalCandidates}</span></span>
              <span>Hired: <span className="font-semibold tabular-nums text-foreground">{analytics.totalHired}</span></span>
            </div>
          </WidgetCard>
        )}
      </div>
    </PageWrapper>
  );
}
