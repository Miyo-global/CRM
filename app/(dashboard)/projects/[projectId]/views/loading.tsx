import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ViewsLoading() {
  return (
    <PageWrapper
      title="Views"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="space-y-6">
        <section>
          <Skeleton className="h-3.5 w-16 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-3.5 w-24 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-4 w-4 rounded shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
