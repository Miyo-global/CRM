"use client";

import { usePendingApprovals, type PendingApprovalsCount } from "@/lib/api/hooks/dashboard";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import Link from "next/link";

export function PendingApprovalsCard() {
  const { data, isLoading } = usePendingApprovals();
  const counts = data as PendingApprovalsCount | undefined;

  return (
    <WidgetCard title="Pending Approvals" icon={Bell} tone="warning" count={counts?.total || undefined}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : !counts || counts.total === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">Nothing to approve.</p>
      ) : (
        <div className="-mx-2">
          <Link
            href="/hr/leaves"
            aria-label={`${counts.pendingLeaves} pending leave requests`}
            className="block rounded-md outline-none focus-visible:focus-ring"
          >
            <WidgetListRow
              className="hover:bg-accent"
              title="Leave Requests"
              trailing={
                counts.pendingLeaves > 0 && (
                  <span className="font-mono text-sm tabular-nums text-foreground">{counts.pendingLeaves}</span>
                )
              }
            />
          </Link>
          <Link
            href="/hr/exit"
            aria-label={`${counts.pendingResignations} pending resignations`}
            className="block rounded-md outline-none focus-visible:focus-ring"
          >
            <WidgetListRow
              className="hover:bg-accent"
              title="Resignations"
              trailing={
                counts.pendingResignations > 0 && (
                  <span className="font-mono text-sm tabular-nums text-foreground">{counts.pendingResignations}</span>
                )
              }
            />
          </Link>
        </div>
      )}
    </WidgetCard>
  );
}
