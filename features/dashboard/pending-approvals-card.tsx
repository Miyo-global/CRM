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
          {[
            { href: "/hr/leaves?tab=approvals", title: "Leave Requests", label: "pending leave requests", count: counts.pendingLeaves },
            { href: "/hr/exit", title: "Resignations", label: "pending resignations", count: counts.pendingResignations },
            { href: "/hr/loans", title: "Salary Loans", label: "pending salary loans", count: counts.pendingLoans },
            { href: "/hr/expenses?status=PENDING", title: "Expenses", label: "pending expense claims", count: counts.pendingExpenses },
          ].map((row) => (
            <Link
              key={row.href}
              href={row.href}
              aria-label={`${row.count} ${row.label}`}
              className="block rounded-md outline-none focus-visible:focus-ring"
            >
              <WidgetListRow
                className="hover:bg-accent"
                title={row.title}
                trailing={
                  row.count > 0 && (
                    <span className="font-mono text-sm tabular-nums text-foreground">{row.count}</span>
                  )
                }
              />
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
