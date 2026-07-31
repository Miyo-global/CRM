"use client";

import { ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useSlaCompliance } from "@/lib/api/hooks/crm";
import { cn } from "@/lib/utils";


const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-violet-100 text-violet-700 border-violet-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
};


function SlaLoadingSkeleton() {
  return (
    <PageWrapper
      title="SLA Compliance"
      subtitle="Track first-response and resolution time vs SLA targets"
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </PageWrapper>
  );
}


export default function SlaCompliancePage() {
  const { data, isLoading } = useSlaCompliance();

  if (isLoading) return <SlaLoadingSkeleton />;

  const s = data?.stats ?? {
    totalTickets: 0,
    withinSla: 0,
    slaBreached: 0,
    complianceRate: 100,
    avgResolutionHours: 0,
  };

  return (
    <PageWrapper
      title="SLA Compliance"
      subtitle="Track first-response and resolution time vs SLA targets"
      actions={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
          <span>{s.totalTickets} total tickets</span>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Compliance Rate"
            value={`${s.complianceRate}%`}
            color="green"
            icon={ShieldAlert}
          />
          <StatCard
            label="Within SLA"
            value={s.withinSla}
            color="blue"
            icon={CheckCircle2}
          />
          <StatCard
            label="SLA Breached"
            value={s.slaBreached}
            color="red"
            icon={XCircle}
          />
          <StatCard
            label="Avg Resolution"
            value={`${s.avgResolutionHours}h`}
            color="gold"
            icon={Clock}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown by Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[600px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Priority</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Within SLA</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Breached</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Avg Resolution</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">SLA Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.byPriority ?? []).map((row) => (
                      <tr key={row.priority} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              PRIORITY_BADGE[row.priority] ?? PRIORITY_BADGE.MEDIUM
                            )}
                          >
                            {row.priority.toLowerCase()}
                          </Badge>
                        </td>
                        <td className="text-right px-4 py-3 tabular-nums">{row.total}</td>
                        <td className="text-right px-4 py-3 tabular-nums text-emerald-600">{row.withinSla}</td>
                        <td className="text-right px-4 py-3 tabular-nums">
                          <span
                            className={cn(
                              "font-medium",
                              row.breached > 0 ? "text-red-600" : "text-muted-foreground"
                            )}
                          >
                            {row.breached}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">
                          {row.avgResolutionHours > 0 ? `${row.avgResolutionHours}h` : ""}
                        </td>
                        <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">
                          {row.slaTarget}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-base">Recent SLA Breaches</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(data?.recentBreaches ?? []).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                No SLA breaches — great work!
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.recentBreaches ?? []).map((breach) => {
                  const overdueBy = Math.max(0, breach.hoursOpen - breach.slaTarget);
                  return (
                    <div
                      key={breach.id}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg border border-red-100 bg-red-50/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground font-mono">#{breach.id}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              PRIORITY_BADGE[breach.priority] ?? PRIORITY_BADGE.MEDIUM
                            )}
                          >
                            {breach.priority.toLowerCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              STATUS_BADGE[breach.status] ?? STATUS_BADGE.OPEN
                            )}
                          >
                            {breach.status.toLowerCase().replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{breach.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(breach.createdAt).toLocaleDateString("en-IN")}
                          &nbsp;·&nbsp; Open {breach.hoursOpen}h
                          &nbsp;·&nbsp; SLA target {breach.slaTarget}h
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-semibold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                          +{Math.round(overdueBy)}h overdue
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
