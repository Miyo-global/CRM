"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Bell, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function PendingApprovalsWidget() {
  const { data, isLoading, error, refetch } = useManagerDashboard();
  const total = data ? data.pendingLeaveApprovals + data.pendingExpenseApprovals : undefined;

  return (
    <WidgetCard title="Pending Approvals" icon={Bell} tone="warning" count={total || undefined} contentClassName="space-y-3">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !data || (data.pendingLeaveApprovals === 0 && data.pendingExpenseApprovals === 0) ? (
        <div className="flex items-center gap-3 rounded-md bg-success-soft px-3 py-2.5 text-sm text-success-strong">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          All caught up!
        </div>
      ) : (
        <div className="-mx-2">
          <Link
            href="/hr/leaves"
            aria-label={`${data.pendingLeaveApprovals} pending leave requests`}
            className="block rounded-md outline-none focus-visible:focus-ring"
          >
            <WidgetListRow
              className="hover:bg-accent"
              title="Leave Requests"
              trailing={
                data.pendingLeaveApprovals > 0 && (
                  <StatusPill tone="danger" className="tabular-nums">{data.pendingLeaveApprovals}</StatusPill>
                )
              }
            />
          </Link>
          <Link
            href="/hr/expenses"
            aria-label={`${data.pendingExpenseApprovals} pending expense approvals`}
            className="block rounded-md outline-none focus-visible:focus-ring"
          >
            <WidgetListRow
              className="hover:bg-accent"
              title="Expense Reports"
              trailing={
                data.pendingExpenseApprovals > 0 && (
                  <StatusPill tone="danger" className="tabular-nums">{data.pendingExpenseApprovals}</StatusPill>
                )
              }
            />
          </Link>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href="/hr/leaves" aria-label="Review leave requests">Review Leaves</Link>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href="/hr/expenses" aria-label="Review expense reports">Review Expenses</Link>
        </Button>
      </div>
    </WidgetCard>
  );
}
