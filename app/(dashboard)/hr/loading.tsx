import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function HrLoading() {
  const filterBar = (
    <div className="flex items-center gap-2 w-full">
      <Skeleton className="h-8 w-64 rounded-md" />
      <Skeleton className="h-8 w-32 rounded-md" />
      <Skeleton className="h-8 w-28 rounded-md" />
      <Skeleton className="h-8 w-28 rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage your company directory and employee access"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      }
      filters={filterBar}
      noInternalScroll
      contentClassName="flex flex-col"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <Skeleton className="h-9 w-[90px] rounded-md" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-9 w-[70px] rounded-md" />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
