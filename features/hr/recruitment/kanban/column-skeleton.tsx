"use client";

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "./types";

interface ColumnSkeletonProps {
  col: ColumnConfig;
}

export const ColumnSkeleton = memo(function ColumnSkeleton({ col }: ColumnSkeletonProps) {
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-6 ml-auto rounded-full" />
      </div>
      <div className={cn("flex-1 rounded-xl border p-2 space-y-2", col.bg, col.border)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
});
