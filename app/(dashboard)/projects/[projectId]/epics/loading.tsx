import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function EpicsLoading() {
  return (
    <PageWrapper
      title="Epics"
      subtitle="Loading epics..."
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3.5 w-64" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
                <div className="ml-9 mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
