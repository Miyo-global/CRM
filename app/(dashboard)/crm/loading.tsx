import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CrmHubLoading() {
  return (
    <PageWrapper title="CRM" subtitle="Command center">
      <div className="space-y-4 pb-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-3 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-24" />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
