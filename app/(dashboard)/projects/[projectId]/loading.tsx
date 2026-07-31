import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";

export default function ProjectBoardLoading() {
  const filterBar = (
    <div className="flex items-center gap-2 w-full">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded-md" />
        ))}
      </div>
      <div className="w-px h-5 bg-border/60 shrink-0 hidden sm:block" />
      <Skeleton className="h-7 w-48 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
      <div className="w-px h-5 bg-border/60 shrink-0 hidden sm:block" />
      <div className="ml-auto flex items-center gap-1.5">
        <Skeleton className="h-5 w-8 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Loading project..."
      noInternalScroll
      contentClassName="!p-0"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      filters={filterBar}
    >
      <div className="h-full w-full px-3 pt-2 pb-1 overflow-hidden">
        <KanbanBoardSkeleton />
      </div>
    </PageWrapper>
  );
}
