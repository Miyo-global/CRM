import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NewInvoiceLoading() {
  return (
    <PageWrapper
      title="New Invoice"
      subtitle="Create a new invoice for a client"
      actions={<Skeleton className="h-8 w-20 rounded-md" />}
    >
      <div className="max-w-3xl space-y-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-12 gap-2">
              <Skeleton className="col-span-5 h-3" />
              <Skeleton className="col-span-2 h-3" />
              <Skeleton className="col-span-2 h-3" />
              <Skeleton className="col-span-2 h-3" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Skeleton className="col-span-5 h-8 rounded-md" />
                <Skeleton className="col-span-2 h-8 rounded-md" />
                <Skeleton className="col-span-2 h-8 rounded-md" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-1 h-8 w-8 rounded" />
              </div>
            ))}
            <Skeleton className="h-8 w-24 rounded-md mt-2" />
          </div>
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="flex justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /></div>
            <div className="flex justify-between"><Skeleton className="h-5 w-12" /><Skeleton className="h-5 w-24" /></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>
    </PageWrapper>
  );
}
