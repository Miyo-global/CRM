import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <PageWrapper title="Calendar" noInternalScroll>
      <div className="flex flex-col h-full gap-3">

        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <Skeleton className="h-full w-full rounded-lg min-h-[420px]" />
        </div>
      </div>
    </PageWrapper>
  );
}
