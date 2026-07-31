import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function WorkLogsLoading() {
  return (
    <PageWrapper title="Work Logs" subtitle="Log and review your daily work activities.">
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, m) => (
          <Card key={m}>
            <CardHeader className="flex flex-row items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, d) => (
                  <div key={d} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
