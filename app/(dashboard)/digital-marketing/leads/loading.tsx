import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DmLeadsLoading() {
  const filters = (
    <>
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-9 w-[150px] rounded-md" />
      <Skeleton className="h-9 w-[140px] rounded-md" />
    </>
  );

  return (
    <PageWrapper
      title="DM Lead Capture"
      subtitle="Capture and manage leads from digital marketing campaigns"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={filters}
    >
      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          ))}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-14 rounded-md" />
              <Skeleton className="h-8 w-14 rounded-md" />
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
