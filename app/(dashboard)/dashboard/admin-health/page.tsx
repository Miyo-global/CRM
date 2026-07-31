"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Users, AlertTriangle, Clock, Wallet, CalendarDays } from "lucide-react";
import Link from "next/link";

interface AdminHealthData {
  unassignedLeads: number;
  overdueTasks: number;
  pendingExpenses: { count: number; totalAmount: string };
  pendingLeaves: number;
  /** Roster rows under the org (same as HR dashboard "Total Employees"). */
  totalEmployees: number;
  /** Accounts with is_active = true (same as HR "Active"). */
  activeEmployees: number;
}

export default function AdminHealthDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.dashboard.all, "admin-health"],
    queryFn: () => apiClient.get<AdminHealthData>("/dashboard/admin-health"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="System Health" subtitle="Live snapshot of open items that need attention across the organization">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[172px] rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const kpis = [
    {
      label: "Unassigned Leads",
      value: data?.unassignedLeads ?? 0,
      icon: AlertTriangle,
      color: (data?.unassignedLeads ?? 0) > 0 ? "text-red-500" : "text-green-500",
      bgColor: (data?.unassignedLeads ?? 0) > 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950",
      description: "Leads without an assigned owner",
      link: "/crm/leads?assignedToId=",
    },
    {
      label: "Overdue Tasks",
      value: data?.overdueTasks ?? 0,
      icon: Clock,
      color: (data?.overdueTasks ?? 0) > 0 ? "text-amber-500" : "text-green-500",
      bgColor: (data?.overdueTasks ?? 0) > 0 ? "bg-amber-50 dark:bg-amber-950" : "bg-green-50 dark:bg-green-950",
      description: "Tasks past their due date",
      link: "/tasks/overdue",
    },
    {
      label: "Pending Expenses",
      value: data?.pendingExpenses.count ?? 0,
      icon: Wallet,
      color: (data?.pendingExpenses.count ?? 0) > 0 ? "text-blue-500" : "text-green-500",
      bgColor: (data?.pendingExpenses.count ?? 0) > 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-green-50 dark:bg-green-950",
      description: `INR ${Number(data?.pendingExpenses.totalAmount ?? 0).toLocaleString("en-IN")} awaiting approval`,
      link: "/hr/expenses?status=PENDING",
    },
    {
      label: "Pending Leave Requests",
      value: data?.pendingLeaves ?? 0,
      icon: CalendarDays,
      color: (data?.pendingLeaves ?? 0) > 0 ? "text-orange-500" : "text-green-500",
      bgColor: (data?.pendingLeaves ?? 0) > 0 ? "bg-orange-50 dark:bg-orange-950" : "bg-green-50 dark:bg-green-950",
      description: "Leave requests awaiting approval",
      link: "/hr/leaves?status=PENDING",
    },
    {
      label: "Total Employees",
      value: data?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      description: (() => {
        const total = data?.totalEmployees ?? 0;
        const active = data?.activeEmployees ?? 0;
        if (total === 0) return "No members on the organization roster yet";
        if (active === total) return "All roster members have active accounts";
        return `${active} active · ${total - active} inactive on roster`;
      })(),
      link: "/hr/employees",
    },
  ];

  return (
    <PageWrapper title="System Health" subtitle="Live snapshot of open items that need attention across the organization">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.link} className="h-full">
              <Card className={`${kpi.bgColor} h-full border-0 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer rounded-xl`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </CardHeader>
                <CardContent className="flex min-h-[112px] flex-col justify-between gap-2">
                  <div>
                    <p className={`text-3xl font-bold leading-none tracking-tight ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 min-h-[32px]">{kpi.description}</p>
                  </div>
                  <div className="mt-3 h-2" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
