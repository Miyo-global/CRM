import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function TimelineLoading() {
  return (
    <PageWrapper title="Timeline" subtitle="Loading timeline...">
      <div className="h-full px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-16" />
            ))}
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton
                  className="h-6 rounded"
                  style={{
                    width: `${30 + (i * 13) % 50}%`,
                    marginLeft: `${(i * 7) % 30}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
