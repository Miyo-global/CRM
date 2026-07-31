import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NotificationsLoading() {
  const tabsFilter = (
    <div className="flex items-center gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-16 rounded-md" />
      ))}
    </div>
  );

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={<Skeleton className="h-8 w-40 rounded-md" />}
      filters={tabsFilter}
    >
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full max-w-md" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
