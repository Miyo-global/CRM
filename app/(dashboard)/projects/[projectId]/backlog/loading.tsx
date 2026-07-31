import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function BacklogLoading() {
  const filterBar = (
    <div className="flex items-center gap-2 w-full">
      <Skeleton className="h-7 w-48 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Loading tickets..."
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      filters={filterBar}
    >
      <div className="border rounded-lg mx-4 mb-4 overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-24 flex-1" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="w-20 flex items-center gap-1.5">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
