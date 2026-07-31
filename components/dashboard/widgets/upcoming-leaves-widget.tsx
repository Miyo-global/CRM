"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { useUpcomingLeaves } from "@/lib/api/hooks/dashboard";
import { CalendarCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { resolveImageUrl } from "@/lib/utils";

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
  const today = startOfDay(new Date());
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

export function UpcomingLeavesWidget() {
  const { data, isLoading, error } = useUpcomingLeaves();
  const leaves = data ?? [];

  return (
    <Card className="flex w-full max-w-full flex-col self-start overflow-hidden md:max-h-[min(28rem,55vh)]">
      <CardHeader className="shrink-0 space-y-1 pb-3">
        <div className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <CardTitle className="text-sm font-semibold leading-tight">Upcoming leaves</CardTitle>
              <p className="text-xs text-muted-foreground">Approved team leaves · next 30 days</p>
            </div>
          </div>
          <Link
            href="/hr/leaves"
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="View leaves and time off"
          >
            Leaves
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !leaves.length ? (
          <EmptyState
            illustration={<EmptyCalendarIllustration className="h-20 w-20" />}
            title="No upcoming leaves"
            description="No approved leaves overlap the next 30 days."
            compact
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {leaves.map((leave) => {
              const days =
                differenceInCalendarDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
              const initial = (leave.userName ?? "?").trim()[0]?.toUpperCase() ?? "?";
              const timing = leaveTimingLabel(leave.startDate, leave.endDate);
              const halfLabel = halfDayLabel(leave.isHalfDay ?? null, leave.halfDayPeriod ?? null);
              const reason = (leave.reason ?? "").trim();

              return (
                <li
                  key={leave.id}
                  className="rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={resolveImageUrl(leave.userImage)}
                        alt={leave.userName ?? "Employee"}
                      />
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold leading-snug">{leave.userName ?? ""}</p>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {leave.leaveType ? (
                            <Badge variant="secondary" className="max-w-[10rem] truncate text-[10px] font-normal">
                              {leave.leaveType}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              Leave
                            </Badge>
                          )}
                          {halfLabel ? (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {halfLabel}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      {leave.userDesignation ? (
                        <p className="text-[11px] text-muted-foreground">{leave.userDesignation}</p>
                      ) : null}
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground/90">{formatRange(leave.startDate, leave.endDate)}</span>
                        <span className="text-muted-foreground/70"> · </span>
                        <span className="tabular-nums font-medium">
                          {days} {days === 1 ? "day" : "days"}
                        </span>
                        {timing ? (
                          <>
                            <span className="text-muted-foreground/70"> · </span>
                            <span>{timing}</span>
                          </>
                        ) : null}
                      </p>
                      {reason ? (
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground" title={reason}>
                          <span className="font-medium text-foreground/80">Note: </span>
                          {reason}
                        </p>
                      ) : null}
                    </div>
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
