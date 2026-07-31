import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SentimentAnalysisLoading() {
  return (
    <PageWrapper
      title="Client Sentiment Analysis"
      subtitle="Paste recent client communications to detect sentiment and churn risk"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-5 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
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
