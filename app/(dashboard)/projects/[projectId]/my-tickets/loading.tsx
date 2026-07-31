import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyTicketsLoading() {
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
      title="My Tickets"
      subtitle="Loading tickets assigned to you"
      badge={
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      }
      filters={filterBar}
    >
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-24 flex-1" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-8 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
