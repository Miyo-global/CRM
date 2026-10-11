"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { useExecutiveDashboard } from "@/lib/api/hooks/dashboard";
import { FolderKanban } from "lucide-react";

export function ProjectHealthWidget() {
  const { data, isLoading, error, refetch } = useExecutiveDashboard();

  return (
    <WidgetCard
      title="Project Health"
      icon={FolderKanban}
      tone="info"
      actions={<ViewAllLink href="/projects" ariaLabel="View all projects" />}
    >
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-brand-soft p-4">
            <dt className="text-xs text-muted-foreground">Active Projects</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums text-foreground">
              {data?.activeProjects ?? 0}
            </dd>
          </div>
          <div className="rounded-md bg-surface-sunken p-4">
            <dt className="text-xs text-muted-foreground">New Leads (7d)</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums text-foreground">
              {data?.newLeadsThisWeek ?? 0}
            </dd>
          </div>
        </dl>
      )}
    </WidgetCard>
  );
}
