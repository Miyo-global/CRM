import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AISalesToolsLoading() {
  return (
    <PageWrapper
      title="AI Sales Tools"
      subtitle="AI-powered tools to help close more deals and craft better campaigns"
    >
      <div className="space-y-5">
        <div className="flex gap-1 h-9 w-full max-w-sm rounded-lg bg-muted p-1">
          <Skeleton className="flex-1 rounded-md" />
          <Skeleton className="flex-1 rounded-md" />
        </div>

        <Skeleton className="h-12 w-full rounded-lg" />

        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-44 rounded-md" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
