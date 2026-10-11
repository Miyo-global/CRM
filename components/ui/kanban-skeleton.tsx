import { Skeleton } from "./skeleton";

export function KanbanColumnSkeleton() {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg bg-surface-sunken">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <Skeleton className="size-6" />
      </div>

      <div className="flex-1 space-y-2 overflow-hidden p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2.5 rounded-lg border border-border bg-card p-3 shadow-xs">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex h-full min-w-max gap-4" role="status" aria-label="Loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}
