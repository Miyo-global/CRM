"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  hasHeader?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonCard({ hasHeader = true, lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      {hasHeader && (
        <div className="mb-4">
          <Skeleton className="h-5 w-1/3 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${70 + ((i * 37) % 30)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
