import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ClientAccountsLoading() {
  const filters = (
    <>
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-9 w-40 rounded-md" />
    </>
  );

  return (
    <PageWrapper
      title="Client Accounts"
      subtitle="Post-conversion client management — track account opening through investment"
      filters={filters}
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-7 w-10" />
                </div>
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border border-border rounded-md">
          <div className="border-b border-border bg-muted/40 px-3 py-2 flex items-center gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-8 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
