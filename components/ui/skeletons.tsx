import { cn } from "../../lib/utils";
import { Skeleton } from "./skeleton";
import { KanbanBoardSkeleton } from "./kanban-skeleton";

export { DashboardSkeleton, DashboardStatsSkeleton } from "./dashboard-skeleton";

/** Archetype skeletons for `loading.tsx` files (§7.8). Each mirrors the real layout. */

const card = "rounded-lg border border-border bg-card shadow-xs";

/** Mirrors PageWrapper's header: breadcrumbs, title, subtitle, actions. */
export function PageHeaderSkeleton({ actions = 2, className }: { actions?: number; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-4 lg:px-6 pt-6 pb-4", className)}>
      <Skeleton className="mb-3 h-3 w-40" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Toolbar (search + filters) above a table card of `rows` rows. */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  toolbar = true,
  className,
}: {
  rows?: number;
  columns?: number;
  toolbar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="ml-auto h-9 w-24" />
        </div>
      )}
      <div className={cn(card, "overflow-hidden")}>
        <div className="flex h-9 items-center gap-4 bg-surface-sunken px-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i === 0 ? "w-32" : "flex-1")} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex h-12 items-center gap-4 border-t border-border px-3">
            {Array.from({ length: columns }).map((_, c) =>
              c === 0 ? (
                <div key={c} className="flex w-32 items-center gap-2">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ) : (
                <Skeleton key={c} className="h-3.5 flex-1" />
              ),
            )}
          </div>
        ))}
        <div className="flex h-11 items-center justify-between border-t border-border px-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-40" />
        </div>
      </div>
    </div>
  );
}

/** Kanban board: 4 columns × 3 cards. */
export function BoardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-full overflow-hidden", className)}>
      <KanbanBoardSkeleton />
    </div>
  );
}

/** Record detail: header + main column with a 320px right rail. */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Loading">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-6 border-b border-border pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={cn(card, "space-y-3 p-5")}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <div className={cn(card, "space-y-4 p-5")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Form/editor: sections of label + input pairs in a reading-width card. */
export function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn(card, "max-w-3xl space-y-6 p-5", className)} role="status" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

/** Report/analytics: filter row + grid of chart cards. */
export function ChartGridSkeleton({ charts = 4, className }: { charts?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Loading">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: charts }).map((_, i) => (
          <div key={i} className={cn(card, "p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-56 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
