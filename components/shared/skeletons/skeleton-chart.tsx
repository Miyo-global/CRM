"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonChartProps {
  height?: number;
  className?: string;
}

export function SkeletonChart({ height = 300, className }: SkeletonChartProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + ((i * 23 + 13) % 60)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}
