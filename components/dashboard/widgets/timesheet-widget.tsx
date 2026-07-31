"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TimesheetWidget() {
  const { data, isLoading, error } = usePersonalDashboard();
  const ts = data?.timesheetStatus;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Timesheet</CardTitle>
        </div>
        <Link
          href="/timesheets"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="Go to timesheets"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
        {isLoading ? (
          <div className="w-full space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : ts ? (
          <>
            <div
              className={cn(
                "w-full rounded-xl px-4 py-4 flex flex-col items-center gap-1 text-center",
                ts.submitted
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              )}
            >
              {ts.submitted ? (
                <CheckCircle2
                  className="h-7 w-7 text-emerald-500 mb-1"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="h-7 w-7 text-red-500 mb-1"
                  aria-hidden="true"
                />
              )}
              <p
                className={cn(
                  "text-sm font-semibold",
                  ts.submitted
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-700 dark:text-red-300"
                )}
              >
                {ts.submitted ? "Week Submitted" : "Hours Missing"}
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {ts.hoursLogged.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{ts.weekLabel}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
