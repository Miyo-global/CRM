import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function OrgChartLoading() {
  return (
    <PageWrapper title="Org Chart" subtitle="View the organisation structure.">
      <div className="flex-1 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-8">
              <Skeleton className="h-24 w-48 rounded-xl" />
              <div className="flex gap-12">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-4">
                    <Skeleton className="h-20 w-40 rounded-xl" />
                    <div className="flex gap-6">
                      <Skeleton className="h-16 w-32 rounded-lg" />
                      <Skeleton className="h-16 w-32 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
