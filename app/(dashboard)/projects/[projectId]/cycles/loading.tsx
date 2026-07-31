import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CyclesLoading() {
  return (
    <PageWrapper
      title="Cycles"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="space-y-6">
        <section>
          <Skeleton className="h-3.5 w-16 mb-3" />
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-24 mt-1" />
            </CardContent>
          </Card>
        </section>

        <section>
          <Skeleton className="h-3.5 w-24 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-3.5 w-32 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="opacity-70">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
