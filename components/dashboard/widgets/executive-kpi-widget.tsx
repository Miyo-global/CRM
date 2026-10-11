"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/ui/icon-chip";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { DollarSign, TrendingUp, Users, Target, Briefcase, Contact2, BarChart2 } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import type { Tone } from "@/lib/design/tones";

interface Kpi {
  label: string;
  value: string | number;
  icon: typeof DollarSign;
  tone: Tone;
  href?: string;
}

function KpiTile({ label, value, icon, tone, href, className = "" }: Kpi & { className?: string }) {
  const body = (
    <>
      <IconChip icon={icon} tone={tone} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="block truncate font-display text-xl font-bold tabular-nums text-foreground">{value}</span>
      </span>
    </>
  );
  const cls = `flex items-center gap-3 bg-card px-4 py-3 ${className}`;
  return href ? (
    <Link href={href} className={`${cls} outline-none transition-colors hover:bg-accent focus-visible:focus-ring`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ExecutiveKpiWidget() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(0)}K`
      : `${CURRENCY_SYMBOL}${n}`;

  const kpis: Kpi[] = data
    ? [
        { label: "MRR (Won)", value: fmt(data.mrr), icon: DollarSign, tone: "brand" },
        { label: "Pipeline Value", value: fmt(data.pipelineValue), icon: TrendingUp, tone: "info", href: "/crm/deals" },
        { label: "Headcount", value: data.headcount, icon: Users, tone: "success", href: "/hr" },
        { label: "New Leads (7d)", value: data.newLeadsThisWeek, icon: Contact2, tone: "plum", href: "/crm/leads" },
        { label: "Open Roles", value: data.openRoles, icon: Briefcase, tone: "brand", href: "/hr/recruitment" },
        { label: "Active Projects", value: data.activeProjects, icon: BarChart2, tone: "info", href: "/projects" },
        { label: "Conversion Rate", value: `${data.conversionRate}%`, icon: Target, tone: "success", href: "/crm/leads" },
      ]
    : [];

  return (
    <WidgetCard title="Key metrics" icon={BarChart2}>
      {error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k, i) => (
            // Last (7th) tile spans two columns so the grid has no empty cell.
            <KpiTile key={k.label} {...k} className={i === kpis.length - 1 ? "sm:col-span-2" : ""} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
