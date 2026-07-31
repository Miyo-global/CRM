"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Bell, CalendarCheck, Receipt, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function PendingApprovalsWidget() {
  const { data, isLoading, error } = useManagerDashboard();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0 shrink-0">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !data || (data.pendingLeaveApprovals === 0 && data.pendingExpenseApprovals === 0) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
            All caught up!
          </div>
        ) : (
          <>
            <Link
              href="/hr/leaves"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
              aria-label={`${data.pendingLeaveApprovals} pending leave requests`}
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm">Leave Requests</span>
              </div>
              {data.pendingLeaveApprovals > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold min-w-[1.5rem] px-1.5 py-0.5">
                  {data.pendingLeaveApprovals}
                </span>
              )}
            </Link>
            <Link
              href="/hr/expenses"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
              aria-label={`${data.pendingExpenseApprovals} pending expense approvals`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm">Expense Reports</span>
              </div>
              {data.pendingExpenseApprovals > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold min-w-[1.5rem] px-1.5 py-0.5">
                  {data.pendingExpenseApprovals}
                </span>
              )}
            </Link>
          </>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href="/hr/leaves" aria-label="Review leave requests">Review Leaves</Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href="/hr/expenses" aria-label="Review expense reports">Review Expenses</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
