"use client";
import { useMemo, useState } from "react";
import { useHrAnalytics } from "@/lib/api/hooks/hr";
import { useHrDepartments } from "@/lib/api/hooks/hr/employees";
import {
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
  RetentionSection,
  PerformanceSection,
  WorkforceTrendsSection,
  AttendanceSection,
  LeaveAnalyticsSection,
  CompensationSection,
  DiversitySection,
  VBars,
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
  TrendingUp as IcoTrendUp, CalendarDays as IcoCalendar, Clock as IcoClock,
  IndianRupee as IcoCoin, UserMinus as IcoUserMinus, ClipboardList as IcoClipboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { monthBars } from "@/lib/hr/month-bars";
import { countDepartments } from "@/lib/hr/department-count";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardGate } from "@/components/shared/dashboard-gate";
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
  const { data: retention, isLoading: retentionLoading } = useRetentionAnalytics(filters);
  const { data: performance, isLoading: perfLoading } = usePerformanceAnalytics(filters);
  const { data: workforceTrends, isLoading: trendsLoading } = useWorkforceTrends(filters);
  const { data: diversity, isLoading: diversityLoading } = useDiversityAnalytics();
  const { data: compensation, isLoading: compensationLoading } = useCompensationAnalytics();

  // Anchor the attendance month to today, clamped into the filter range: taking
  // it from filters.from showed January for the default year range, so the tab
  // read 0 logs while the overview card showed this month's (QA-0015).
  const { year: filterYear, month: filterMonth } = useMemo(() => {
    const today = new Date();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T00:00:00`) : null;
    const anchor = to && today > to ? to : from && today < from ? from : today;
    return { year: anchor.getFullYear(), month: anchor.getMonth() + 1 };
  }, [filters.from, filters.to]);
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceAnalytics(filterYear, filterMonth);
  const { data: leaveData, isLoading: leaveLoading } = useLeaveAnalytics(filterYear);

  const rangeLabel = `${filters.from} to ${filters.to}`;

  const totalLeaves = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.leaves.byStatus).reduce((s, v) => s + v, 0);
  }, [data]);

  return (
    <PageWrapper
      title="HR analytics"
      actions={
        <span data-print="hide" className="contents">
          <Button variant="outline" size="sm"
            onClick={() => void downloadAnalyticsXlsx({ executive, retention, performance, workforceTrends, attendance: attendanceData, leave: leaveData, compensation, diversity, rangeLabel })}>
            <IcoSpreadsheet className="size-4" aria-hidden="true" />
            Excel
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => downloadAnalyticsCsv({ executive, retention, performance, workforceTrends, attendance: attendanceData, leave: leaveData, compensation, diversity, rangeLabel })}>
            <IcoFileText className="size-4" aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => window.print()}>
            <IcoPrinter className="size-4" aria-hidden="true" />
            PDF
          </Button>
        </span>
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
          {/* The list scrolls itself; a second scroller around it clipped it at 375px (QA-RESP-06). */}
          <TabsList variant="underline">
            {TAB_LIST.map(({ value, label, Icon }) => (
              <TabsTrigger key={value} value={value} className="shrink-0 gap-1.5">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

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
                    { label: "Departments", icon: IcoGrid, value: countDepartments(data.departments.map((d) => d.name)) },
                  ]}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="font-sans text-sm font-semibold">Department Distribution</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {data.departments.length > 0 ? (
                        <OverviewHBar data={data.departments.map((d) => ({ label: d.name, value: d.count }))} />
                      ) : (
                        <EmptyState compact title="No department data" />
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

                  <Card>
                    <CardHeader><CardTitle className="font-sans text-sm font-semibold">Leave Requests by Month</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      <VBars data={monthBars(data.leaves.byMonth)} height={112} emptyMessage="No leave requests this year" />
                    </CardContent>
                  </Card>
                </div>

                <HrDashboardOverview />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="workforce" className="space-y-4 mt-0">
            <WorkforceTrendsSection data={workforceTrends} isLoading={trendsLoading} />
            <DiversitySection data={diversity} isLoading={diversityLoading} />
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
