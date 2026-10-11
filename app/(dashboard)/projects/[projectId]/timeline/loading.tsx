import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="px-4 sm:px-6 xl:px-8 pt-4 pb-10" role="status" aria-label="Loading">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="ml-auto h-9 w-40" />
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 space-y-2 bg-card p-2">
              <Skeleton className="h-3 w-6" />
              {i % 3 === 0 && <Skeleton className="h-4 w-full" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
