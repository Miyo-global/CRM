import { Card, CardContent } from "./card";
import { Skeleton } from "./skeleton";

export function KanbanColumnSkeleton() {
  return (
    <div className="rounded-xl border border-border min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex flex-col bg-muted/30 border-t-2 flex-shrink-0 h-full">

      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-t-xl bg-muted/50">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Skeleton className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-6 rounded-md" />
      </div>

      <div className="flex-1 overflow-y-auto min-h-[120px] p-2 sm:p-2.5 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-3 shadow-sm">
            <CardContent className="p-0 space-y-2">

              <Skeleton className="h-5 w-full" />

              <Skeleton className="h-4 w-3/4" />

              <div className="flex items-center justify-between mt-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex h-full gap-3 sm:gap-4 md:gap-4" style={{ minWidth: 'max-content' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}
