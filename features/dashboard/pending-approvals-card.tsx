"use client";

import { usePendingApprovals, type PendingApprovalsCount } from "@/lib/api/hooks/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CalendarCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function PendingApprovalsCard() {
  const { data, isLoading } = usePendingApprovals();
  const counts = data as PendingApprovalsCount | undefined;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : !counts || counts.total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
            All caught up!
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/hr/leaves"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
              aria-label={`${counts.pendingLeaves} pending leave requests`}
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm">Leave Requests</span>
              </div>
              {counts.pendingLeaves > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold min-w-[1.5rem] px-1.5 py-0.5">
                  {counts.pendingLeaves}
                </span>
              )}
            </Link>
            <Link
              href="/hr/exit"
              className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
              aria-label={`${counts.pendingResignations} pending resignations`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm">Resignations</span>
              </div>
              {counts.pendingResignations > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold min-w-[1.5rem] px-1.5 py-0.5">
                  {counts.pendingResignations}
                </span>
              )}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
