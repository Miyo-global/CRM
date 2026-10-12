"use client";

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toneDot } from "@/lib/design/tones";
import type { ColumnConfig } from "./types";

interface ColumnSkeletonProps {
  col: ColumnConfig;
}

export const ColumnSkeleton = memo(function ColumnSkeleton({ col }: ColumnSkeletonProps) {
  return (
    <div className="flex w-[296px] shrink-0 snap-start flex-col rounded-lg bg-muted/60" aria-hidden="true">
      <div className="flex h-11 items-center gap-2 px-3">
        <span className={cn("size-2 shrink-0 rounded-full", toneDot[col.tone])} />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-7 rounded-full" />
      </div>
      <div className="space-y-2 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-4 w-1/3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
});
