"use client";

import { useUpcomingLeaves, type UpcomingLeave } from "@/lib/api/hooks/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/utils";

interface UpcomingLeavesCardProps {
  isAdmin: boolean;
}

export function UpcomingLeavesCard({ isAdmin }: UpcomingLeavesCardProps) {
  const { data, isLoading } = useUpcomingLeaves({ enabled: isAdmin });
  const leaves = data ?? [];

  return (
    <Card className="flex h-full max-h-[22rem] flex-col self-start overflow-hidden">
      <CardHeader className="shrink-0 space-y-0 pb-3">
        <div className="flex flex-row items-center gap-2">
          <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <CardTitle className="text-sm font-semibold">Upcoming leaves</CardTitle>
            <p className="text-xs text-muted-foreground">Approved · next 30 days</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
            No overlapping leaves in the next 30 days
          </div>
        ) : (
          <ul className="space-y-2.5">
            {leaves.map((leave: UpcomingLeave) => {
              const days =
                differenceInCalendarDays(parseISO(leave.endDate), parseISO(leave.startDate)) + 1;
              return (
                <li key={leave.id} className="flex gap-2.5 rounded-md border bg-card/50 px-2 py-1.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={resolveImageUrl(leave.userImage)}
                      alt={leave.userName ?? "Employee"}
                    />
                    <AvatarFallback className="text-xs">
                      {(leave.userName ?? "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{leave.userName ?? ""}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(parseISO(leave.startDate), "EEE, MMM d")}
                      {" – "}
                      {format(parseISO(leave.endDate), "EEE, MMM d")}
                      <span className="text-muted-foreground/80"> · </span>
                      <span className="tabular-nums">{days}d</span>
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {leave.leaveType ? (
                        <Badge variant="secondary" className="max-w-full truncate px-1.5 py-0 text-[10px] font-normal">
                          {leave.leaveType}
                        </Badge>
                      ) : null}
                      {leave.isHalfDay ? (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                          Half day
                        </Badge>
                      ) : null}
                    </div>
                    {leave.reason?.trim() ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{leave.reason.trim()}</p>
                    ) : null}
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
