"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { Umbrella } from "lucide-react";

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

/** Circular progress ring (logo circle motif): gold arc on an ink track, value centred. */
export function LeaveRing({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div
        className="relative size-14"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${value} of ${total} days remaining`}
      >
        <svg viewBox="0 0 56 56" className="size-14 -rotate-90" aria-hidden="true">
          <circle cx="28" cy="28" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={RING_R}
            fill="none"
            stroke="var(--gold-400)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-base font-bold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <span className="w-full truncate text-xs font-medium text-foreground" title={label}>
        {label}
      </span>
      <span className="text-2xs tabular-nums text-muted-foreground">of {total} days</span>
    </div>
  );
}

export function LeaveBalanceWidget() {
  const { data, isLoading, error, refetch } = usePersonalDashboard();
  const balances = data?.leaveBalance ?? [];

  return (
    <WidgetCard
      title="Leave Balance"
      icon={Umbrella}
      tone="brand"
      actions={<ViewAllLink href="/hr/leaves" ariaLabel="View leave details" />}
    >
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="mx-auto size-14 rounded-full" />
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !balances.length ? (
        <EmptyState
          illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
          title="No leave data"
          description="No leave balances set up yet."
          compact
        />
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-4">
          {balances.slice(0, 6).map((b) => (
            <li key={b.type} className="min-w-0">
              <LeaveRing value={b.remaining} total={b.total} label={b.type} />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
