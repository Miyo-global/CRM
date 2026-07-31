import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CandidatesLoading() {
  return (
    <PageWrapper
      title="Candidates"
      subtitle="Manage your talent pipeline"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-[200px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-16" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-7 w-10 rounded-md" />
                    <Skeleton className="h-7 w-[120px] rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {Array.from({ length: 1 }).map((_, i) => (
            <Card key={`empty-${i}`} className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="pb-8">
                <Skeleton className="mx-auto h-36 w-56" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
