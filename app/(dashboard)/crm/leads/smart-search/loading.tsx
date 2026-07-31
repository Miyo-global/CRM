import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SmartLeadSearchLoading() {
  return (
    <PageWrapper title="Smart Lead Search" subtitle='Search leads using natural language — "hot leads from Mumbai above 5L"'>
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-11" />
          <Skeleton className="w-28 h-11" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-7 w-36 rounded-full" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    </PageWrapper>
  );
}
