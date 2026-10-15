"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/design/tones";

const MAX_ROWS = 6;

const statusTone: Record<string, Tone> = {
  present: "success",
  absent: "danger",
  leave: "warning",
};

export function TeamAttendanceWidget() {
  const { data, isLoading, error, refetch } = useManagerDashboard();
  const members = data?.teamAttendanceToday ?? [];

  const presentCount = members.filter((m) => m.status === "present").length;
  const absentCount = members.filter((m) => m.status === "absent").length;

  return (
    <WidgetCard
      title="Team Attendance"
      icon={Users}
      tone="success"
      count={members.length || undefined}
      actions={<ViewAllLink href="/hr/attendance" ariaLabel="View full attendance" />}
      contentClassName="space-y-2"
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !members.length ? (
        <EmptyState
          title="No team members"
          compact
        />
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", toneDot.success)} aria-hidden="true" />
              {presentCount} present
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", toneDot.danger)} aria-hidden="true" />
              {absentCount} absent
            </span>
          </div>
          <ul className="-mx-2">
            {members.slice(0, MAX_ROWS).map((m) => (
              <li key={m.userId}>
                <WidgetListRow
                  leading={
                    <Avatar className="size-8">
                      <AvatarFallback className="text-2xs">{m.name[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                  }
                  title={m.name}
                  trailing={
                    <StatusPill tone={statusTone[m.status] ?? "neutral"} dot className="capitalize">
                      {m.status}
                    </StatusPill>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </WidgetCard>
  );
}
