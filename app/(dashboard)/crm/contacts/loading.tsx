import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ContactsLoading() {
  return (
    <PageWrapper
      title="Contacts"
      subtitle="People directory"
      actions={
        <>
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </>
      }
      filters={<Skeleton className="h-8 w-72 rounded-md" />}
    >
      <div className="border border-border rounded-md">
        <div className="border-b border-border bg-muted/40 px-3 py-2 flex items-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
          <Skeleton className="h-3 w-8 ml-auto" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-3 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-7 ml-auto rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
