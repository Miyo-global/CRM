import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIInsightsLoading() {
  return (
    <PageWrapper
      title="AI Campaign Insights"
      subtitle="Weekly AI-powered summary of your marketing performance"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 shrink-0">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}
