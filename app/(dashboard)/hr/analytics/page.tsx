"use client";
// REWRITTEN — clean tabs, SVG icons, no lucide
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

function IcoSpreadsheet({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></svg>;
}
function IcoFileText({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function IcoPrinter({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
}
function IcoGrid({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
function IcoTrendUp({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function IcoBriefcase({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
}
function IcoCalendar({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IcoClock({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IcoCoin({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function IcoUserMinus({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
}
function IcoClipboard({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" ry="1" /></svg>;
}

function OverviewHBar({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground w-24 shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-4 bg-muted/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${item.color ?? "bg-primary"}`} style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
          <span className="text-[11px] font-semibold tabular-nums w-8 text-right">{item.value}</span>
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
  const { data, isLoading } = useHrAnalytics();
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
    <PageWrapper title="HR Analytics" subtitle="Workforce insights across all dimensions">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <AnalyticsFilterBar
            value={filters}
            onChange={setFilters}
            departments={(departments ?? []) as { id: number; name: string }[]}
          />
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => void downloadAnalyticsXlsx({ executive, recruitment, retention, performance, rangeLabel })}>
              <IcoSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => downloadAnalyticsCsv({ executive, recruitment, retention, performance, rangeLabel })}>
              <IcoFileText className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => window.print()}>
              <IcoPrinter className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        <ExecutiveKpiStrip data={executive} isLoading={execLoading} />

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto -mx-0.5 px-0.5 pb-0.5">
            <TabsList className="inline-flex h-auto gap-1 p-1 bg-muted/60 rounded-xl w-max min-w-full sm:w-auto">
              {TAB_LIST.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium shrink-0 rounded-lg data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4 mt-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-7 w-14" /></CardContent></Card>
                ))}
              </div>
            ) : data ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2.5"><span className="text-[11px] font-medium text-muted-foreground">Attendance (month)</span><IcoCalendar className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-bold tabular-nums tracking-tight">{data.attendance.totalLogsThisMonth}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2.5"><span className="text-[11px] font-medium text-muted-foreground">Leaves (YTD)</span><IcoClock className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-bold tabular-nums tracking-tight">{totalLeaves}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2.5"><span className="text-[11px] font-medium text-muted-foreground">Departments</span><IcoGrid className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-bold tabular-nums tracking-tight">{data.departments.length}</p></CardContent></Card>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="px-5 py-4 pb-2"><CardTitle className="text-sm">Department Distribution</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {data.departments.length > 0 ? (
                        <OverviewHBar data={data.departments.map((d) => ({ label: d.name, value: d.count }))} />
                      ) : (
                        <div className="py-8 flex flex-col items-center">
                          <EmptyLeaderboardIllustration className="h-20 w-20 opacity-70 mb-2" />
                          <p className="text-xs text-muted-foreground">No department data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="px-5 py-4 pb-2"><CardTitle className="text-sm">Role Distribution</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {data.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {data.roles.map((r) => (
                            <Badge key={r.role} variant="secondary" className="text-xs gap-1.5 py-1 px-2.5">
                              {r.role}<span className="font-bold text-foreground">{r.count}</span>
                            </Badge>
                          ))}
                        </div>
                      ) : <p className="text-xs text-muted-foreground text-center py-6">No role data</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="px-5 py-4 pb-2"><CardTitle className="text-sm">Leave Requests by Status (YTD)</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5">
                      {Object.keys(data.leaves.byStatus).length > 0 ? (
                        <OverviewHBar
                          data={Object.entries(data.leaves.byStatus).map(([status, cnt]) => ({
                            label: status,
                            value: cnt,
                            color: status === "APPROVED" ? "bg-emerald-500" : status === "REJECTED" ? "bg-red-500" : "bg-amber-500",
                          }))}
                        />
                      ) : <p className="text-xs text-muted-foreground text-center py-6">No leave data</p>}
                    </CardContent>
                  </Card>

                  {data.leaves.byMonth.length > 0 && (
                    <Card>
                      <CardHeader className="px-5 py-4 pb-2"><CardTitle className="text-sm">Leave Requests by Month</CardTitle></CardHeader>
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
                                    {m.count > 0 && <span className="text-[8px] font-medium tabular-nums text-muted-foreground">{m.count}</span>}
                                    <div className="w-full rounded-t-sm bg-gradient-to-t from-primary/90 to-primary/40" style={{ height: `${h}%` }} />
                                    <span className="text-[8px] text-muted-foreground">{m.month.slice(5)}</span>
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
