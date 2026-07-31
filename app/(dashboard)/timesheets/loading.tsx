import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TimesheetsLoading() {
  const filtersBar = (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-9 w-40 rounded-lg" />
      <Skeleton className="h-9 w-40 rounded-lg" />
      <div className="h-7 w-px bg-border mx-1 hidden sm:block" />
      <Skeleton className="h-8 w-32 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );

  return (
    <PageWrapper
      title="Daily Work Logs"
      subtitle="Track and manage professional activity across projects."
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
      filters={filtersBar}
    >
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/30 px-6 py-4 grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-6 py-4 grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full max-w-[180px]" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 rounded-md" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
