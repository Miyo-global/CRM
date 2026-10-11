"use client";

import { usePendingApprovals, type PendingApprovalsCount } from "@/lib/api/hooks/dashboard";
import { Bell, CalendarCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChip } from "@/components/ui/icon-chip";
import { StatusPill } from "@/components/ui/status-pill";
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
        <div className="flex items-center gap-3 rounded-md bg-success-soft px-3 py-2.5 text-sm text-success-strong">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          All caught up!
        </div>
      ) : (
        <div className="-mx-2">
          <Link
            href="/hr/leaves"
            aria-label={`${counts.pendingLeaves} pending leave requests`}
            className="block rounded-md outline-none focus-visible:focus-ring"
          >
            <WidgetListRow
              className="hover:bg-accent"
              leading={<IconChip icon={CalendarCheck} tone="info" size="sm" />}
              title="Leave Requests"
              trailing={
                counts.pendingLeaves > 0 && (
                  <StatusPill tone="danger" className="tabular-nums">{counts.pendingLeaves}</StatusPill>
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
              leading={<IconChip icon={AlertTriangle} tone="danger" size="sm" />}
              title="Resignations"
              trailing={
                counts.pendingResignations > 0 && (
                  <StatusPill tone="danger" className="tabular-nums">{counts.pendingResignations}</StatusPill>
                )
              }
            />
          </Link>
        </div>
      )}
    </WidgetCard>
  );
}
