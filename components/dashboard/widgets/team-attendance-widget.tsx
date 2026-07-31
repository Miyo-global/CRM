"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useManagerDashboard } from "@/lib/api/hooks/dashboard";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusDot: Record<string, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  leave: "bg-amber-500",
};

export function TeamAttendanceWidget() {
  const { data, isLoading, error } = useManagerDashboard();
  const members = data?.teamAttendanceToday ?? [];

  const presentCount = members.filter((m) => m.status === "present").length;
  const absentCount = members.filter((m) => m.status === "absent").length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">Team Attendance</CardTitle>
        </div>
        <Link
          href="/hr/attendance"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="View full attendance"
        >
          View all
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-3 w-3 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load.</p>
        ) : !members.length ? (
          <EmptyState
            illustration={<EmptyTeamIllustration className="h-20 w-20" />}
            title="No team members"
            compact
          />
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                {presentCount} present
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                {absentCount} absent
              </span>
            </div>
            <ul className="space-y-2 overflow-y-auto max-h-52">
              {members.slice(0, 15).map((m) => (
                <li key={m.userId} className="flex items-center gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {m.name[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate flex-1">{m.name}</span>
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDot[m.status] ?? "bg-muted")}
                    aria-label={m.status}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
