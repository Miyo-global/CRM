import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SalesQuotasLoading() {
  return (
    <PageWrapper
      title="Sales Quotas"
      subtitle="Manage revenue targets per rep"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-28" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-16 ml-auto" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-20 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
