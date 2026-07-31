import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TerminationLoading() {
  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
