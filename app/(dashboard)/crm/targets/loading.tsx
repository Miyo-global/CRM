import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TargetsLoading() {
  return (
    <PageWrapper
      title="Targets & Leaderboard"
      subtitle="Track daily targets and team performance rankings"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-noir overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="flex items-end justify-between">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Skeleton className="h-6 w-40 mb-3" />
          <Card className="shadow-noir">
            <CardContent className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
