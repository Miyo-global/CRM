import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ProjectsLoading() {
  const filterBar = (
    <div className="flex items-center gap-2 w-full">
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-8 w-24 rounded-md" />
      <Skeleton className="h-8 w-24 rounded-md" />
      <div className="ml-auto flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Projects"
      badge={<Skeleton className="h-3 w-6" />}
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
      filters={filterBar}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-14 rounded" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex justify-between pt-2 border-t border-border/50">
              <div className="flex -space-x-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-6 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
