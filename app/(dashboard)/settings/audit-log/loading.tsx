import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AuditLogLoading() {
  const filtersBar = (
    <div className="flex flex-wrap gap-2 items-end">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1 min-w-[140px] flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all system actions, logins, and changes across your organization."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      }
      filters={filtersBar}
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="bg-muted/30 px-4 py-3 grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-7 rounded ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-md" />
            ))}
            <Skeleton className="h-4 w-12 ml-1" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
