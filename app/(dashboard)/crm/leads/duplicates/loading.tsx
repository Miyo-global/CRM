import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function DuplicateLeadsLoading() {
  return (
    <PageWrapper title="Duplicate Lead Detection" subtitle="Fuzzy matching to find potential duplicate leads">
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    </PageWrapper>
  );
}
