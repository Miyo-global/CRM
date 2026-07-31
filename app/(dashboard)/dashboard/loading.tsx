import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DashboardLoading() {
  return (
    <PageWrapper
      title="Dashboard"
      subtitle="Loading your workspace…"
      actions={<Skeleton className="h-10 w-32 rounded-md" />}
    >
      <div className="space-y-5">

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 auto-rows-[24rem]">
          <Card className="lg:col-span-4 min-h-0">
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 min-h-0">
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-20 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[24rem]">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="min-h-0">
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
