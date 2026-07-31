"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { Umbrella, ExternalLink } from "lucide-react";
import Link from "next/link";

export function LeaveBalanceWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const balances = data?.leaveBalance ?? [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Umbrella className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Leave Balance</CardTitle>
        </div>
        <Link
          href="/hr/leaves"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="View leave details"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !balances.length ? (
          <EmptyState
            illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
            title="No leave data"
            description="No leave balances set up yet."
            compact
          />
        ) : (
          <ul className="space-y-2">
            {balances.map((b) => {
              const pct = b.total > 0 ? Math.round((b.remaining / b.total) * 100) : 0;
              return (
                <li key={b.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate">{b.type}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                      {b.remaining} / {b.total} days
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={b.remaining}
                      aria-valuemin={0}
                      aria-valuemax={b.total}
                      aria-label={`${b.type}: ${b.remaining} of ${b.total} days remaining`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
