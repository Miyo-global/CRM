"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { DollarSign, TrendingUp, Users, Target, Briefcase, Contact2, BarChart2 } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

export function ExecutiveKpiWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();

  if (error) {
    return <p className="text-sm text-destructive">Failed to load KPIs.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(0)}K`
      : `${CURRENCY_SYMBOL}${n}`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        label="MRR (Won)"
        value={fmt(data.mrr)}
        icon={DollarSign}
        color="gold"
        index={0}
      />
      <StatCard
        label="Pipeline Value"
        value={fmt(data.pipelineValue)}
        icon={TrendingUp}
        color="blue"
        index={1}
        href="/crm/deals"
      />
      <StatCard
        label="Headcount"
        value={data.headcount}
        icon={Users}
        color="green"
        index={2}
        href="/hr"
      />
      <StatCard
        label="New Leads (7d)"
        value={data.newLeadsThisWeek}
        icon={Contact2}
        color="purple"
        index={3}
        href="/crm/leads"
      />
      <StatCard
        label="Open Roles"
        value={data.openRoles}
        icon={Briefcase}
        color="gold"
        index={4}
        href="/hr/recruitment"
      />
      <StatCard
        label="Active Projects"
        value={data.activeProjects}
        icon={BarChart2}
        color="blue"
        index={5}
        href="/projects"
      />
      <StatCard
        label="Conversion Rate"
        value={`${data.conversionRate}%`}
        icon={Target}
        color="green"
        index={6}
        href="/crm/leads"
      />
    </div>
  );
}
