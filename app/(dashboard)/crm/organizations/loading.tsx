import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function OrganizationsLoading() {
  return (
    <PageWrapper
      title="Organizations"
      subtitle="Company accounts"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
      filters={<Skeleton className="h-9 w-72 rounded-md" />}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-3 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
