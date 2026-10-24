"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { Users, BarChart2 } from "lucide-react";
import type { Tone } from "@/lib/design/tones";

interface Kpi {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone: Tone;
  href?: string;
}

function KpiTile({ label, value, icon, tone, href, className = "" }: Kpi & { className?: string }) {
  const body = (
    <>
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

  const kpis: Kpi[] = data
    ? [
        { label: "Headcount", value: data.headcount, icon: Users, tone: "success", href: "/hr" },
        { label: "Active Projects", value: data.activeProjects, icon: BarChart2, tone: "info", href: "/projects" },
      ]
    : [];

  return (
    <WidgetCard title="Key metrics" icon={BarChart2}>
      {error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {kpis.map((k) => (
            <KpiTile key={k.label} {...k} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
