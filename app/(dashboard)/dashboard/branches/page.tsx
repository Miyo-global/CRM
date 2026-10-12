"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip, type StatsStripItem } from "@/components/shared/stats-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Building2, Users, Clock, Briefcase, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

interface BranchUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface BranchKpi {
  id: number;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  status: string;
  branchManager: BranchUser | null;
  branchHr: BranchUser | null;
  kpis: {
    employees: number;
    workLogHours: number;
    pendingExpenses: { count: number; total: number };
    clients: number;
  };
}

interface BranchOverviewData {
  summary: {
    totalBranches: number;
    activeBranches: number;
    totalEmployees: number;
    totalWorkLogHours: number;
    totalClients: number;
  };
  branches: BranchKpi[];
}

export default function BranchCommandCenterPage() {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.branches.all, "overview"],
    queryFn: () => apiClient.get<BranchOverviewData>("/dashboard/branch-overview"),
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Branch Command Center" subtitle="Monitor and manage all branches">
        <Skeleton className="mb-6 h-20 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Branch Command Center" subtitle="Monitor and manage all branches">
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const summary = data?.summary;
  const branches = data?.branches ?? [];

  const summaryItems: StatsStripItem[] = [
    { label: "Total Branches", value: summary?.totalBranches ?? 0, icon: Building2, tone: "info" },
    { label: "Active", value: summary?.activeBranches ?? 0, icon: BarChart3, tone: "success" },
    { label: "Total Employees", value: summary?.totalEmployees ?? 0, icon: Users, tone: "plum" },
    { label: "Hours (This Month)", value: Math.round(summary?.totalWorkLogHours ?? 0), icon: Clock, tone: "warning" },
    { label: "Total Clients", value: summary?.totalClients ?? 0, icon: Briefcase, tone: "brand" },
  ];

  return (
    <PageWrapper
      title="Branch Command Center"
      subtitle="Monitor and manage all branches from one place"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/branches">Manage Branches</Link>
        </Button>
      }
    >
      <StatsStrip items={summaryItems} className="mb-6" />

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Comparison Table</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {branches.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No branches yet"
              description="Branches you add in settings will appear here."
              action={{ label: "Manage Branches", href: "/settings/branches" }}
            />
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} isSelected={selectedBranch === branch.id} onSelect={() => setSelectedBranch(selectedBranch === branch.id ? null : branch.id)} />
            ))}
          </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Hours (Month)</TableHead>
                      <TableHead className="text-right">Clients</TableHead>
                      <TableHead className="text-right">Pending Expenses</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <IconChip icon={Building2} tone="info" size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{branch.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">{branch.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {[branch.city, branch.state].filter(Boolean).join(", ") || ""}
                        </TableCell>
                        <TableCell>{branch.branchManager?.name || ""}</TableCell>
                        <TableCell>
                          <StatusPill tone={branch.status === "ACTIVE" ? "success" : "neutral"} dot>
                            {branch.status}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{branch.kpis.employees}</TableCell>
                        <TableCell className="text-right tabular-nums">{Math.round(branch.kpis.workLogHours)}</TableCell>
                        <TableCell className="text-right tabular-nums">{branch.kpis.clients}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {branch.kpis.pendingExpenses.count > 0 ? (
                            <span className="text-warning-strong font-medium">
                              {branch.kpis.pendingExpenses.count} (INR {branch.kpis.pendingExpenses.total.toLocaleString(DEFAULT_LOCALE)})
                            </span>
                          ) : (
                            <span className="text-success-strong">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

function BranchCard({ branch, isSelected, onSelect }: { branch: BranchKpi; isSelected: boolean; onSelect: () => void }) {
  return (
    <Card
      interactive
      className={isSelected ? "border-primary ring-2 ring-ring" : undefined}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <IconChip icon={Building2} tone="info" />
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{branch.name}</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">{branch.code}</span>
            </div>
          </div>
          <StatusPill tone={branch.status === "ACTIVE" ? "success" : "neutral"} dot>
            {branch.status}
          </StatusPill>
        </div>
        {(branch.city || branch.state) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {[branch.city, branch.state].filter(Boolean).join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-md bg-surface-sunken/60 p-2">
            <p className="text-xs text-muted-foreground">Employees</p>
            <p className="font-display text-lg font-bold tabular-nums">{branch.kpis.employees}</p>
          </div>
          <div className="rounded-md bg-surface-sunken/60 p-2">
            <p className="text-xs text-muted-foreground">Hours (Month)</p>
            <p className="font-display text-lg font-bold tabular-nums">{Math.round(branch.kpis.workLogHours)}</p>
          </div>
          <div className="rounded-md bg-surface-sunken/60 p-2">
            <p className="text-xs text-muted-foreground">Clients</p>
            <p className="font-display text-lg font-bold tabular-nums">{branch.kpis.clients}</p>
          </div>
          <div className="rounded-md bg-surface-sunken/60 p-2">
            <p className="text-xs text-muted-foreground">Pending Expenses</p>
            <p className={`font-display text-lg font-bold tabular-nums ${branch.kpis.pendingExpenses.count > 0 ? "text-warning-strong" : "text-success-strong"}`}>
              {branch.kpis.pendingExpenses.count}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm">
          {branch.branchManager && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={branch.branchManager.image ?? undefined} />
                <AvatarFallback className="text-2xs">
                  {branch.branchManager.name?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">Manager</p>
                <p className="text-xs font-medium">{branch.branchManager.name}</p>
              </div>
            </div>
          )}
          {branch.branchHr && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={branch.branchHr.image ?? undefined} />
                <AvatarFallback className="text-2xs">
                  {branch.branchHr.name?.charAt(0) || "H"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">HR</p>
                <p className="text-xs font-medium">{branch.branchHr.name}</p>
              </div>
            </div>
          )}
          {!branch.branchManager && !branch.branchHr && (
            <p className="text-xs text-muted-foreground">No manager/HR assigned</p>
          )}
        </div>

        {isSelected && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {branch.kpis.pendingExpenses.count > 0 && (
              <p className="text-sm text-warning-strong">
                INR {branch.kpis.pendingExpenses.total.toLocaleString(DEFAULT_LOCALE)} in pending expense approvals
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/settings/branches`}>Edit Branch</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/hr/employees?branchId=${branch.id}`}>View Employees</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
