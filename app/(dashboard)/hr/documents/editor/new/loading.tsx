import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function NewDocumentLoading() {
  return (
    <PageWrapper
      title="New Document"
      subtitle="Choose a template to get started"
      actions={<Skeleton className="h-8 w-20 rounded-md" />}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
