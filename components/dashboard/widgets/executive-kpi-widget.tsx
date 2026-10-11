"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { Users, Briefcase, BarChart2 } from "lucide-react";

export function ExecutiveKpiWidget() {
  const { data, isLoading, error } = useExecutiveDashboard();

  if (error) {
    return <p className="text-sm text-destructive">Failed to load KPIs.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Headcount"
        value={data.headcount}
        icon={Users}
        color="green"
        index={0}
        href="/hr"
      />
      <StatCard
        label="Open Roles"
        value={data.openRoles}
        icon={Briefcase}
        color="gold"
        index={1}
        href="/hr/recruitment"
      />
      <StatCard
        label="Active Projects"
        value={data.activeProjects}
        icon={BarChart2}
        color="blue"
        index={2}
        href="/projects"
      />
    </div>
  );
}
