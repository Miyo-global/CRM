import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function InvoiceDetailLoading() {
  return (
    <PageWrapper
      title="Invoice"
      subtitle="Loading invoice…"
      badge={<Skeleton className="h-4 w-12" />}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      }
    >
      <div className="space-y-6 max-w-3xl">
        <div className="rounded-lg border border-border bg-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
          <div className="col-span-2 space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="px-4 py-3 grid grid-cols-12 gap-3">
            <Skeleton className="col-span-6 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                <Skeleton className="col-span-6 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-4" />
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="flex justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /></div>
            <div className="flex justify-between"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-24" /></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </PageWrapper>
  );
}
