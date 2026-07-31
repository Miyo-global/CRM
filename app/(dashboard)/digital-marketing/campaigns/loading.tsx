import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DmCampaignsLoading() {
  return (
    <PageWrapper
      title="Campaign Management"
      subtitle="Manage marketing campaigns and track ROI"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </Card>
      </div>
    </PageWrapper>
  );
}
