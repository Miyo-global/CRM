"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export function SkeletonForm({ fields = 4, className }: SkeletonFormProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 rounded-md mt-2" />
    </div>
  );
}
