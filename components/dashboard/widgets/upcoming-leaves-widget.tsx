"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useUpcomingLeaves } from "@/lib/api/hooks/dashboard";
import { CalendarCheck } from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { getTodayString } from "@/lib/date-utils";

function formatRange(startIso: string, endIso: string) {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (start.getTime() === end.getTime()) {
    return format(start, "EEE, MMM d, yyyy");
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, "EEE, MMM d")} – ${format(end, "EEE, d, yyyy")}`;
  }
  return `${format(start, "EEE, MMM d, yyyy")} – ${format(end, "EEE, MMM d, yyyy")}`;
}

function leaveTimingLabel(startDate: string, endDate: string) {
  // Org-timezone today, so "Starts today" matches the dashboard clock (R3-TZ-01).
  const today = parseISO(getTodayString());
  const start = startOfDay(parseISO(startDate));
  const end = startOfDay(parseISO(endDate));
  if (start < today) {
    if (end < today) return "";
    if (end.getTime() === today.getTime()) return "Ends today";
    return `In progress · until ${format(end, "MMM d, yyyy")}`;
  }
  if (start.getTime() === today.getTime()) return "Starts today";
  const days = differenceInCalendarDays(start, today);
  if (days === 1) return "Starts tomorrow";
  return `Starts in ${days} days`;
}

function halfDayLabel(isHalfDay: boolean | null, halfDayPeriod: string | null) {
  if (!isHalfDay) return null;
  const p = (halfDayPeriod ?? "").trim();
  if (!p) return "Half day";
  return `Half day (${p})`;
}

const MAX_ROWS = 6;

export function UpcomingLeavesWidget() {
  const { data, isLoading, error, refetch } = useUpcomingLeaves();
  const leaves = data ?? [];

  return (
    <WidgetCard
      title="Upcoming leaves"
      icon={CalendarCheck}
      tone="teal"
      count={leaves.length || undefined}
      actions={<ViewAllLink href="/hr/leaves" label="Leaves" ariaLabel="View leaves and time off" />}
    >
      <p className="-mt-1 mb-2 text-xs text-muted-foreground">Approved team leaves · next 30 days</p>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !leaves.length ? (
        <EmptyState
          title="No upcoming leaves"
          description="No approved leaves overlap the next 30 days."
          compact
        />
      ) : (
        <ul className="-mx-2">
          {leaves.slice(0, MAX_ROWS).map((leave) => {
            const days =
              differenceInCalendarDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
            const initial = (leave.userName ?? "?").trim()[0]?.toUpperCase() ?? "?";
            const timing = leaveTimingLabel(leave.startDate, leave.endDate);
            const halfLabel = halfDayLabel(leave.isHalfDay ?? null, leave.halfDayPeriod ?? null);
            const reason = (leave.reason ?? "").trim();

            return (
              <li
                key={leave.id}
                className="flex gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={resolveImageUrl(leave.userImage)} alt={leave.userName ?? "Employee"} />
                  <AvatarFallback className="bg-brand-soft text-2xs font-semibold text-brand-soft-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">
                      {leave.userName ?? ""}
                      {leave.userDesignation ? (
                        <span className="font-normal text-muted-foreground"> · {leave.userDesignation}</span>
                      ) : null}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusPill tone="teal" className="max-w-32 truncate">
                        {leave.leaveType || "Leave"}
                      </StatusPill>
                      {halfLabel ? <StatusPill tone="neutral">{halfLabel}</StatusPill> : null}
                    </div>
                  </div>
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    {formatRange(leave.startDate, leave.endDate)} · {days} {days === 1 ? "day" : "days"}
                    {timing ? ` · ${timing}` : ""}
                  </p>
                  {reason ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground" title={reason}>
                      <span className="font-medium text-foreground">Note: </span>
                      {reason}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
