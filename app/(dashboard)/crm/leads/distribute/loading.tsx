import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function LeadDistributionLoading() {
  const filters = (
    <>
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-9 w-32 rounded-md" />
    </>
  );

  return (
    <PageWrapper
      title="Lead Distribution"
      subtitle="Upload leads and distribute to your sales team via round-robin"
      filters={filters}
      actions={
        <>
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-border bg-muted/40 px-4 py-2.5 flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </Card>
    </PageWrapper>
  );
}
