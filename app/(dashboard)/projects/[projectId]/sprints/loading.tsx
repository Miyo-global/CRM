import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SprintsLoading() {
  return (
    <PageWrapper
      title="Sprints"
      subtitle="Loading sprints..."
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3.5 w-56" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 p-2 rounded-md border">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3.5 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
