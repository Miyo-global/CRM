import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";

/** KPI row: 4 stat cards (label, value, delta, icon chip). */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 shadow-xs", className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Hub/dashboard bento: KPI row + chart widget + side widgets. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <DashboardStatsSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
        <WidgetSkeleton />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={3} className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}
