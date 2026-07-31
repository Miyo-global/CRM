import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function MyPayslipsLoading() {
  return (
    <PageWrapper title="My Payslips" subtitle="View your payslip history.">
      <div className="space-y-6">

        <div className="flex items-center justify-end gap-2">
          <Skeleton className="h-10 w-8" />
          <Skeleton className="h-10 w-48" />
        </div>

        <Skeleton className="h-10 w-56" />

        <Card>
          <CardHeader className="text-center space-y-2">
            <Skeleton className="h-7 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-36" />
                </div>
              ))}
            </div>

            <Skeleton className="h-px w-full" />

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="h-px w-full" />

            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
