"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors WidgetCard: icon chip + title header, then 44px list rows. */
export function WidgetSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={className ? `h-full ${className}` : "h-full"}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
      <div className="space-y-2 px-5 pb-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
