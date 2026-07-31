"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonListProps {
  items?: number;
  hasAvatar?: boolean;
  className?: string;
}

export function SkeletonList({ items = 5, hasAvatar = false, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {hasAvatar && <Skeleton className="h-9 w-9 rounded-full shrink-0" />}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
