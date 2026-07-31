import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PipelineLoading() {
  return (
    <PageWrapper
      title="Candidate Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      actions={<Skeleton className="h-8 w-20 rounded-md" />}
    >
      <div className="flex h-full gap-3 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border min-w-[260px] w-[260px] flex flex-col bg-muted/30 border-t-2 flex-shrink-0 h-full"
          >
            <div className="flex items-center justify-between p-3 rounded-t-xl bg-muted/50">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-6 rounded-md" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Card key={j} className="p-3 shadow-sm">
                  <CardContent className="p-0 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
