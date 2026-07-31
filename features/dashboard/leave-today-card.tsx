"use client";

import { useLeavesToday, type LeaveToday } from "@/lib/api/hooks/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageUrl } from "@/lib/utils";

interface LeaveTodayCardProps {
  isAdmin: boolean;
}

export function LeaveTodayCard({ isAdmin }: LeaveTodayCardProps) {
  const { data, isLoading } = useLeavesToday({ enabled: isAdmin });
  const leaves = data ?? [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
        <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Who&apos;s On Leave Today</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" aria-hidden="true" />
            Everyone is in today
          </div>
        ) : (
          <ul className="space-y-3">
            {leaves.map((leave: LeaveToday) => (
              <li key={leave.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={resolveImageUrl(leave.employeeImage)}
                    alt={leave.employeeName ?? "Employee"}
                  />
                  <AvatarFallback className="text-xs">
                    {(leave.employeeName ?? "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{leave.employeeName ?? ""}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {leave.employeeDesignation ?? ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
