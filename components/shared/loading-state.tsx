import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  variant?: "table" | "cards" | "list" | "form" | "page";
  className?: string;
  rows?: number;
}

function TableSkeleton({ rows = 6 }: { rows: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 px-3 py-2 border-b border-border/60">
        {[40, 25, 20, 15].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-3 py-3">
          {[40, 25, 20, 15].map((w, j) => (
            <Skeleton key={j} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton({ rows = 6 }: { rows: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 8 }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ rows = 6 }: { rows: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/60 p-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-3/4" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}

export function LoadingState({
  variant = "table",
  className,
  rows = 6,
}: LoadingStateProps) {
  return (
    <div className={cn("p-4", className)} aria-label="Loading..." aria-busy="true">
      {variant === "table" && <TableSkeleton rows={rows} />}
      {variant === "cards" && <CardsSkeleton rows={rows} />}
      {variant === "list" && <ListSkeleton rows={rows} />}
      {variant === "form" && <FormSkeleton rows={rows} />}
      {variant === "page" && <PageSkeleton />}
    </div>
  );
}
