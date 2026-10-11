"use client";

import { useLeavesToday, type LeaveToday } from "@/lib/api/hooks/dashboard";
import { CheckCircle2, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { resolveImageUrl } from "@/lib/utils";

interface LeaveTodayCardProps {
  isAdmin: boolean;
}

export function LeaveTodayCard({ isAdmin }: LeaveTodayCardProps) {
  const { data, isLoading } = useLeavesToday({ enabled: isAdmin });
  const leaves = data ?? [];

  return (
    <WidgetCard title="Who's On Leave Today" icon={UserCheck} tone="warning" count={leaves.length || undefined}>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-11 items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : leaves.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md bg-success-soft px-3 py-2.5 text-sm text-success-strong">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Everyone is in today
        </div>
      ) : (
        <ul className="-mx-2">
          {leaves.slice(0, 6).map((leave: LeaveToday) => (
            <li key={leave.id}>
              <WidgetListRow
                leading={
                  <Avatar className="size-8">
                    <AvatarImage src={resolveImageUrl(leave.employeeImage)} alt={leave.employeeName ?? "Employee"} />
                    <AvatarFallback className="text-2xs">{(leave.employeeName ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                }
                title={leave.employeeName ?? ""}
                meta={leave.employeeDesignation ?? ""}
              />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
