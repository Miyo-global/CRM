import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function QRCodeLoading() {
  return (
    <PageWrapper
      title="QR Code Manager"
      subtitle="Generate trackable QR codes for your marketing campaigns."
    >
      <div className="space-y-6">

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border/40">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-4 space-y-3 border-t border-border/30">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
