import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TerritoriesLoading() {
  return (
    <PageWrapper
      title="Territory Management"
      subtitle="Define geographic territories and assign sales reps"
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    </PageWrapper>
  );
}
