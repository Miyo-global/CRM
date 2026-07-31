"use client";

import { useRecruitmentStats, useJobPostings, useInterviews } from "@/lib/api/hooks/hr";
import { useRecruitmentAnalytics } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageBackButton } from "@/components/ui/page-back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, Calendar, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";


const PIE_COLORS = ["#0f2b7f", "#bd882c", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"];

function SourcePieChart({ sources }: { sources: { source: string; count: number }[] }) {
  const data = sources.map((s) => ({ name: s.source, value: s.count }));
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={36}
          outerRadius={60}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, idx) => (
            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function RecruitmentDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();
  const { data: recentJobs, isLoading: jobsLoading } = useJobPostings({ status: "OPEN" });
  const { data: upcomingInterviews, isLoading: interviewsLoading } = useInterviews({ upcoming: true });
  const { data: analytics } = useRecruitmentAnalytics();

  const isLoading = statsLoading || jobsLoading || interviewsLoading;

  if (isLoading) {
    return (
      <PageWrapper title="Recruitment" subtitle="Hire the best talent for your team">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-10" /></CardContent></Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
            <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
          </div>
        </div>
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Jobs", value: stats?.totalJobs ?? 0, icon: Briefcase },
            { label: "Open Positions", value: stats?.openJobs ?? 0, icon: Briefcase },
            { label: "Total Candidates", value: stats?.totalCandidates ?? 0, icon: Users },
            { label: "New Candidates", value: stats?.newCandidates ?? 0, icon: Users },
            { label: "Upcoming Interviews", value: stats?.upcomingInterviews ?? 0, icon: Calendar },
            { label: "Hired (Month)", value: stats?.hiredThisMonth ?? 0, icon: UserCheck },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {stats && (stats.funnel || stats.sources?.length > 0) && (
          <div className="grid md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hiring Funnel</h3>
                <div className="space-y-1.5">
                  {["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"].map((stage) => {
                    const cnt = stats.funnel[stage] ?? 0;
                    const max = Math.max(...Object.values(stats.funnel), 1);
                    return (
                      <div key={stage} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-16 shrink-0">{stage}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stage === "HIRED" ? "bg-green-500" : stage === "REJECTED" ? "bg-red-400" : "bg-primary"}`}
                            style={{ width: `${Math.max(2, (cnt / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums w-6 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Candidate Sources</h3>
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
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                <p className="text-3xl font-bold tabular-nums">{stats.avgTimeToHireDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg. Days to Hire</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Open Positions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/hr/recruitment/jobs">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {!recentJobs?.length ? (
                <EmptyState
                  compact
                  icon={Briefcase}
                  title="No open positions yet"
                  description="Open job postings will show up here once you publish them."
                  className="border-0 bg-transparent"
                />
              ) : (
                <div className="max-h-[260px] overflow-y-auto pr-1">
                  {recentJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/hr/recruitment/jobs/${job.id}/edit`}
                      className="flex items-center justify-between gap-2 -mx-2 px-2 py-2 rounded-md border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.location ?? "Remote"} &middot; {job.type}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{job.openings} opening{(job.openings ?? 1) > 1 ? "s" : ""}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Upcoming Interviews</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/hr/recruitment/interviews">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {!upcomingInterviews?.length ? (
                <EmptyState
                  compact
                  icon={Calendar}
                  title="No upcoming interviews"
                  description="Scheduled interviews will appear here."
                  className="border-0 bg-transparent"
                />
              ) : (
                upcomingInterviews.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">
                        {interview.candidate?.firstName} {interview.candidate?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {interview.type} &middot; {formatDistanceToNow(new Date(interview.scheduledAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={interview.result === "PENDING" ? "outline" : "default"}>
                      {interview.result}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {analytics && analytics.funnel.some((s) => s.count > 0) && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-end gap-2 overflow-x-auto pb-2">
                {analytics.funnel.map((stage) => {
                  const maxCount = Math.max(...analytics.funnel.map((s) => s.count), 1);
                  const heightPct = Math.max((stage.count / maxCount) * 100, 4);
                  return (
                    <div key={stage.stage} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                      <span className="text-xs font-semibold tabular-nums">{stage.count}</span>
                      <div className="w-full rounded-t-sm bg-primary/80" style={{ height: `${heightPct * 0.6}px`, minHeight: 4 }} />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{stage.stage}</span>
                      {stage.avgDaysInStage !== null && (
                        <span className="text-[10px] text-muted-foreground">{stage.avgDaysInStage}d avg</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Hire Rate: <span className="font-semibold text-foreground">{analytics.hireRate}%</span></span>
                <span>Total: <span className="font-semibold text-foreground">{analytics.totalCandidates}</span></span>
                <span>Hired: <span className="font-semibold text-foreground">{analytics.totalHired}</span></span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
