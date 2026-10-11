"use client";
import { useMemo, useState } from "react";
import { useHrAnalytics } from "@/lib/api/hooks/hr";
import { useHrDepartments } from "@/lib/api/hooks/hr/employees";
import {
  useRecruitmentAnalytics,
  useRetentionAnalytics,
  usePerformanceAnalytics,
  useExecutiveKpis,
  useWorkforceTrends,
  useAttendanceAnalytics,
  useCompensationAnalytics,
  useLeaveAnalytics,
  useDiversityAnalytics,
} from "@/lib/api/hooks/hr/analytics-extended";
import {
  AnalyticsFilterBar,
  ExecutiveKpiStrip,
  RecruitmentSection,
  RetentionSection,
  PerformanceSection,
  WorkforceTrendsSection,
  AttendanceSection,
  LeaveAnalyticsSection,
  CompensationSection,
  DiversitySection,
  type FilterValues,
} from "@/features/hr/analytics/analytics-sections";
import { downloadAnalyticsXlsx, downloadAnalyticsCsv } from "@/lib/export/hr-analytics-export";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsStrip } from "@/components/shared/stats-strip";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileSpreadsheet as IcoSpreadsheet, FileText as IcoFileText, Printer as IcoPrinter, LayoutGrid as IcoGrid,
  TrendingUp as IcoTrendUp, Briefcase as IcoBriefcase, CalendarDays as IcoCalendar, Clock as IcoClock,
  IndianRupee as IcoCoin, UserMinus as IcoUserMinus, ClipboardList as IcoClipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { HrDashboardOverview } from "@/features/hr/hr-dashboard-overview";

function defaultFilters(): FilterValues {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31`, department: "all" };
}

function OverviewHBar({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="w-24 shrink-0 truncate text-xs text-muted-foreground" title={item.label}>{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", item.color ?? "bg-chart-1")} style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

const TAB_LIST = [
  { value: "overview", label: "Overview", Icon: IcoGrid },
  { value: "workforce", label: "Workforce", Icon: IcoTrendUp },
  { value: "recruitment", label: "Recruitment", Icon: IcoBriefcase },
  { value: "attendance", label: "Attendance", Icon: IcoCalendar },
  { value: "leave", label: "Leave", Icon: IcoClock },
  { value: "compensation", label: "Compensation", Icon: IcoCoin },
  { value: "retention", label: "Retention", Icon: IcoUserMinus },
  { value: "performance", label: "Performance", Icon: IcoClipboard },
] as const;

function AnalyticsContent() {
  const { data, isLoading, isError, error, refetch } = useHrAnalytics();
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const { data: departments } = useHrDepartments();
  const { data: executive, isLoading: execLoading } = useExecutiveKpis(filters);
  const { data: recruitment, isLoading: recruitLoading } = useRecruitmentAnalytics(filters);
  const { data: retention, isLoading: retentionLoading } = useRetentionAnalytics(filters);
  const { data: performance, isLoading: perfLoading } = usePerformanceAnalytics(filters);
  const { data: workforceTrends, isLoading: trendsLoading } = useWorkforceTrends(filters);
  const { data: diversity, isLoading: diversityLoading } = useDiversityAnalytics();
  const { data: compensation, isLoading: compensationLoading } = useCompensationAnalytics();

  const filterYear = filters.from ? Number(filters.from.slice(0, 4)) : new Date().getFullYear();
  const filterMonth = filters.from ? Number(filters.from.slice(5, 7)) : new Date().getMonth() + 1;
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceAnalytics(filterYear, filterMonth);
  const { data: leaveData, isLoading: leaveLoading } = useLeaveAnalytics(filterYear);

  const rangeLabel = `${filters.from} to ${filters.to}`;

  const totalLeaves = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.leaves.byStatus).reduce((s, v) => s + v, 0);
  }, [data]);

  return (
    <PageWrapper
      title="HR Analytics"
      subtitle="Workforce insights across all dimensions"
      actions={
        <>
          <Button variant="outline" size="sm"
            onClick={() => void downloadAnalyticsXlsx({ executive, recruitment, retention, performance, rangeLabel })}>
            <IcoSpreadsheet className="size-4" aria-hidden="true" />
            Excel
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => downloadAnalyticsCsv({ executive, recruitment, retention, performance, rangeLabel })}>
            <IcoFileText className="size-4" aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => window.print()}>
            <IcoPrinter className="size-4" aria-hidden="true" />
            PDF
          </Button>
        </>
      }
      filters={
        <AnalyticsFilterBar
          value={filters}
          onChange={setFilters}
          departments={(departments ?? []) as { id: number; name: string }[]}
        />
      }
    >
      <div className="space-y-6">

        <ExecutiveKpiStrip data={executive} isLoading={execLoading} />

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList variant="underline" className="w-max min-w-full">
              {TAB_LIST.map(({ value, label, Icon }) => (
                <TabsTrigger key={value} value={value} className="shrink-0 gap-1.5">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 mt-0">
            {isLoading ? (
              <Skeleton className="h-20 rounded-lg" />
            ) : isError ? (
              <QueryErrorState error={error} onRetry={() => void refetch()} />
            ) : data ? (
              <>
                <StatsStrip
                  items={[
                    { label: "Attendance (month)", icon: IcoCalendar, value: data.attendance.totalLogsThisMonth },
                    { label: "Leaves (YTD)", icon: IcoClock, value: totalLeaves },
                    { label: "Departments", icon: IcoGrid, value: data.departments.length },
                  ]}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="font-sans text-sm font-semibold">Department Distribution</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {data.departments.length > 0 ? (
                        <OverviewHBar data={data.departments.map((d) => ({ label: d.name, value: d.count }))} />
                      ) : (
                        <EmptyState compact illustration={<EmptyLeaderboardIllustration className="size-20" />} title="No department data" />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="font-sans text-sm font-semibold">Role Distribution</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {data.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {data.roles.map((r) => (
                            <Badge key={r.role} variant="secondary" className="h-6 gap-1.5 px-2.5 text-xs">
                              {r.role}<span className="font-bold tabular-nums text-foreground">{r.count}</span>
                            </Badge>
                          ))}
                        </div>
                      ) : <p className="text-xs text-muted-foreground text-center py-6">No role data</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="font-sans text-sm font-semibold">Leave Requests by Status (YTD)</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {Object.keys(data.leaves.byStatus).length > 0 ? (
                        <OverviewHBar
                          data={Object.entries(data.leaves.byStatus).map(([status, cnt]) => ({
                            label: status,
                            value: cnt,
                            color: status === "APPROVED" ? "bg-success-500" : status === "REJECTED" ? "bg-danger-500" : "bg-warning-500",
                          }))}
                        />
                      ) : <p className="text-xs text-muted-foreground text-center py-6">No leave data</p>}
                    </CardContent>
                  </Card>

                  {data.leaves.byMonth.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="font-sans text-sm font-semibold">Leave Requests by Month</CardTitle></CardHeader>
                      <CardContent className="px-5 pb-5">
                        {(() => {
                          const monthData = data.leaves.byMonth;
                          const max = Math.max(...monthData.map((x) => x.count), 1);
                          return (
                            <div className="flex items-end gap-1 h-28">
                              {monthData.map((m) => {
                                const h = Math.max(6, (m.count / max) * 100);
                                return (
                                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                    {m.count > 0 && <span className="text-3xs font-medium tabular-nums text-muted-foreground">{m.count}</span>}
                                    <div className="w-full max-w-7 rounded-t bg-chart-1" style={{ height: `${h}%` }} />
                                    <span className="text-3xs tabular-nums text-muted-foreground">{m.month.slice(5)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <HrDashboardOverview />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="workforce" className="space-y-4 mt-0">
            <WorkforceTrendsSection data={workforceTrends} isLoading={trendsLoading} />
            <DiversitySection data={diversity} isLoading={diversityLoading} />
          </TabsContent>

          <TabsContent value="recruitment" className="mt-0">
            <RecruitmentSection data={recruitment} isLoading={recruitLoading} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-0">
            <AttendanceSection data={attendanceData} isLoading={attendanceLoading} headcount={executive?.headcount} />
          </TabsContent>

          <TabsContent value="leave" className="mt-0">
            <LeaveAnalyticsSection data={leaveData} isLoading={leaveLoading} />
          </TabsContent>

          <TabsContent value="compensation" className="mt-0">
            <CompensationSection data={compensation} isLoading={compensationLoading} />
          </TabsContent>

          <TabsContent value="retention" className="mt-0">
            <RetentionSection data={retention} isLoading={retentionLoading} />
          </TabsContent>

          <TabsContent value="performance" className="mt-0">
            <PerformanceSection data={performance} isLoading={perfLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

export default function HrAnalyticsPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "ADMIN"]}>
      <AnalyticsContent />
    </DashboardGate>
  );
}
