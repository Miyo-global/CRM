import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SupportInboxLoading() {
  return (
    <PageWrapper
      title="Support Inbox"
      subtitle="Loading…"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
      filters={
        <>
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </>
      }
      noInternalScroll
      contentClassName="flex overflow-hidden !py-0 !px-0"
    >
      <div className="w-full md:w-[360px] border-r border-border/40 flex flex-col overflow-hidden">
        <div className="flex-1 divide-y divide-border/30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 hidden md:flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-3 space-y-4 overflow-hidden">
          <Skeleton className="h-16 w-full rounded-lg" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border/40 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-7 rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-[60px] flex-1 rounded-md" />
            <Skeleton className="h-[60px] w-10 rounded-md" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
