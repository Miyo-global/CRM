"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export function DealsLoadingSkeleton() {
  return (
    <PageWrapper title="Deals Pipeline" subtitle="Track and manage your deals across stages">
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    </PageWrapper>
  );
}
