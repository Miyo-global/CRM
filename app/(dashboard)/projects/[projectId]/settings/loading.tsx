import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ProjectSettingsLoading() {
  return (
    <PageWrapper title="Settings" subtitle="Loading project settings...">
      <div className="max-w-xl mx-auto space-y-6 pb-8">
        <Card>
          <CardContent className="pt-5 space-y-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="h-px bg-border" />

            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>

            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="h-px bg-border" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
