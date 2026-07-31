import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";

export default function LeadsPipelineLoading() {
  const filters = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-56 rounded-md" />
      <Skeleton className="h-8 w-20 rounded-md" />
      <Skeleton className="h-8 w-28 rounded-md" />
      <Skeleton className="h-8 w-28 rounded-md" />
      <Skeleton className="h-8 w-28 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Lead Pipeline"
      subtitle="Track and manage leads through the conversion funnel"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      }
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex-1 min-h-0 mt-2 overflow-auto">
          <KanbanBoardSkeleton />
        </div>
      </div>
    </PageWrapper>
  );
}
