"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { Umbrella } from "lucide-react";

/**
 * Leave balance as a plain line per type — "Casual 2 of 12" — instead of a ring
 * chart (B7). One row, readable at a glance, no decoration.
 */
export function LeaveBalanceRow({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 truncate text-foreground" title={label}>
        {label}
      </span>
      <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
        {value} of {total}
      </span>
    </li>
  );
}

export function LeaveBalanceWidget() {
  const { data, isLoading, error, refetch } = usePersonalDashboard();
  const balances = data?.leaveBalance ?? [];
  // Treat "no data yet" as loading, so the empty copy never flashes first (A33).
  const showSkeleton = isLoading || (!data && !error);

  return (
    <WidgetCard
      title="Leave balance"
      icon={Umbrella}
      tone="brand"
      actions={<ViewAllLink href="/hr/leaves" ariaLabel="View leave details" />}
    >
      {showSkeleton ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !balances.length ? (
        <EmptyState title="No leave balances yet." compact />
      ) : (
        <ul className="divide-y divide-border">
          {balances.slice(0, 6).map((b) => (
            <LeaveBalanceRow key={b.type} value={b.remaining} total={b.total} label={b.type} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
