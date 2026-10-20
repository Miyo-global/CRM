import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesLoadingSkeleton() {
  return (
    // QA-PERF-01: the skeleton mirrors the loaded page — same sticky header,
    // the same three actions and the view toggle — so swapping it for the
    // real page does not shift the layout (CLS 0.105 on /hr).
    <PageWrapper
      title="Employees"
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      }
      filters={
        <div className="flex w-full flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-[220px] rounded-md" />
          <Skeleton className="h-8 w-[130px] rounded-md" />
          <Skeleton className="h-8 w-[110px] rounded-md" />
          <Skeleton className="h-8 w-[120px] rounded-md" />
          <Skeleton className="ml-auto h-9 w-[76px] rounded-md" />
        </div>
      }
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center gap-8 border-b border-border bg-surface-sunken px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-4 w-40 hidden md:block" />
            <Skeleton className="h-4 w-20 hidden lg:block" />
            <Skeleton className="h-4 w-28 hidden lg:block" />
            <Skeleton className="h-4 w-24 hidden lg:block" />
            <Skeleton className="h-4 w-16 hidden xl:block" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-4 py-3 border-b last:border-0">
              <div className="flex items-center gap-3 min-w-[220px]">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-4 w-44 hidden md:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <Skeleton className="h-4 w-28 hidden lg:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <Skeleton className="h-5 w-16 rounded-full hidden xl:block" />
              <Skeleton className="h-7 w-20 rounded-md ml-auto" />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
