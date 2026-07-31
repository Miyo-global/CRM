import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ContentBriefLoading() {
  return (
    <PageWrapper
      title="Content Brief Generator"
      subtitle="AI-powered structured briefs for financial services content"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/5 shrink-0">
          <Card>
            <CardContent className="p-5 space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="flex-1">
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
