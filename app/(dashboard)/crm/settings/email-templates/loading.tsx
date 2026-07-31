import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function EmailTemplatesLoading() {
  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates with dynamic variables"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-4/6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
