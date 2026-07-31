import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PagesLoading() {
  return (
    <PageWrapper
      title="Pages"
      noInternalScroll
      contentClassName="p-0"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="flex h-full overflow-hidden">
        <div className="w-64 border-r overflow-hidden p-3 space-y-1">
          <Skeleton className="h-3 w-16 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`pin-${i}`} className="flex items-center gap-2 py-1.5 px-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
          <div className="border-b my-2" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1.5 px-2"
              style={{ paddingLeft: `${(i % 3) * 16 + 8}px` }}
            >
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <Skeleton className="flex-1 min-h-[400px] w-full rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
