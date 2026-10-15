"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Users, AlertTriangle, Clock, Wallet, CalendarDays } from "lucide-react";
import Link from "next/link";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.dashboard.all, "admin-health"],
    queryFn: () => apiClient.get<AdminHealthData>("/dashboard/admin-health"),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <PageWrapper title="System health">
        <div className="grid grid-cols-12 gap-4 xl:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="col-span-12 h-36 rounded-lg md:col-span-6 xl:col-span-4" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="System health">
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const kpis = [
    {
      label: "Overdue Tasks",
      value: data?.overdueTasks ?? 0,
      icon: Clock,
      tone: (data?.overdueTasks ?? 0) > 0 ? ("warning" as Tone) : ("success" as Tone),
      description: "Tasks past their due date",
      link: "/tasks/overdue",
    },
    {
      label: "Pending Expenses",
      value: data?.pendingExpenses.count ?? 0,
      icon: Wallet,
      tone: (data?.pendingExpenses.count ?? 0) > 0 ? ("info" as Tone) : ("success" as Tone),
      description: `INR ${Number(data?.pendingExpenses.totalAmount ?? 0).toLocaleString(DEFAULT_LOCALE)} awaiting approval`,
      link: "/hr/expenses?status=PENDING",
    },
    {
      label: "Pending Leave Requests",
      value: data?.pendingLeaves ?? 0,
      icon: CalendarDays,
      tone: (data?.pendingLeaves ?? 0) > 0 ? ("warning" as Tone) : ("success" as Tone),
      description: "Leave requests awaiting approval",
      link: "/hr/leaves?status=PENDING",
    },
    {
      label: "Total Employees",
      value: data?.totalEmployees ?? 0,
      icon: Users,
      tone: "info" as Tone,
      description: (() => {
        const total = data?.totalEmployees ?? 0;
        const active = data?.activeEmployees ?? 0;
        if (total === 0) return "No members on the organization roster yet";
        if (active === total) return "All roster members have active accounts";
        return `${active} active · ${total - active} inactive on roster`;
      })(),
      link: "/hr",
    },
  ];

  return (
    <PageWrapper title="System health">
      <div className="grid grid-cols-12 gap-4 xl:gap-6">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.link}
            className="col-span-12 rounded-lg outline-none focus-visible:focus-ring md:col-span-6 xl:col-span-4"
          >
            <Card interactive className="h-full gap-0 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <IconChip icon={kpi.icon} tone={kpi.tone} />
              </div>
              <p className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-foreground">
                {kpi.value}
              </p>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{kpi.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
