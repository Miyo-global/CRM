"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Building2, Users, Clock, Wallet, Briefcase, BarChart3, MapPin } from "lucide-react";
import Link from "next/link";

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

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.branches.all, "overview"],
    queryFn: () => apiClient.get<BranchOverviewData>("/dashboard/branch-overview"),
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Branch Command Center" subtitle="Monitor and manage all branches">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </PageWrapper>
    );
  }

  const summary = data?.summary;
  const branches = data?.branches ?? [];

  const summaryCards = [
    { label: "Total Branches", value: summary?.totalBranches ?? 0, icon: Building2, color: "text-blue-500" },
    { label: "Active", value: summary?.activeBranches ?? 0, icon: BarChart3, color: "text-green-500" },
    { label: "Total Employees", value: summary?.totalEmployees ?? 0, icon: Users, color: "text-purple-500" },
    { label: "Hours (This Month)", value: Math.round(summary?.totalWorkLogHours ?? 0), icon: Clock, color: "text-amber-500" },
    { label: "Total Clients", value: summary?.totalClients ?? 0, icon: Briefcase, color: "text-gold" },
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Comparison Table</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} isSelected={selectedBranch === branch.id} onSelect={() => setSelectedBranch(selectedBranch === branch.id ? null : branch.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <Card>
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
                          <div>
                            <span className="font-medium">{branch.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono">{branch.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {[branch.city, branch.state].filter(Boolean).join(", ") || ""}
                        </TableCell>
                        <TableCell>{branch.branchManager?.name || ""}</TableCell>
                        <TableCell>
                          <Badge variant={branch.status === "ACTIVE" ? "default" : "secondary"} className={branch.status === "ACTIVE" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}>
                            {branch.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{branch.kpis.employees}</TableCell>
                        <TableCell className="text-right">{Math.round(branch.kpis.workLogHours)}</TableCell>
                        <TableCell className="text-right">{branch.kpis.clients}</TableCell>
                        <TableCell className="text-right">
                          {branch.kpis.pendingExpenses.count > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {branch.kpis.pendingExpenses.count} (INR {branch.kpis.pendingExpenses.total.toLocaleString("en-IN")})
                            </span>
                          ) : (
                            <span className="text-green-600">0</span>
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
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-gold" : ""}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">{branch.name}</CardTitle>
            <span className="text-xs text-muted-foreground font-mono">{branch.code}</span>
          </div>
          <Badge variant={branch.status === "ACTIVE" ? "default" : "secondary"} className={branch.status === "ACTIVE" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}>
            {branch.status}
          </Badge>
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
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Employees</p>
            <p className="text-lg font-bold">{branch.kpis.employees}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Hours (Month)</p>
            <p className="text-lg font-bold">{Math.round(branch.kpis.workLogHours)}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Clients</p>
            <p className="text-lg font-bold">{branch.kpis.clients}</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Pending Expenses</p>
            <p className={`text-lg font-bold ${branch.kpis.pendingExpenses.count > 0 ? "text-amber-500" : "text-green-500"}`}>
              {branch.kpis.pendingExpenses.count}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm border-t pt-3">
          {branch.branchManager && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={branch.branchManager.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
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
                <AvatarFallback className="text-[10px]">
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
          <div className="mt-4 pt-4 border-t space-y-2">
            {branch.kpis.pendingExpenses.count > 0 && (
              <p className="text-sm text-amber-600">
                INR {branch.kpis.pendingExpenses.total.toLocaleString("en-IN")} in pending expense approvals
              </p>
            )}
            <div className="flex gap-2">
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
