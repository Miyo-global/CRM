import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-full overflow-hidden bg-background">

      <div className="hidden md:flex flex-col shrink-0 border-r border-border/40 bg-card/50 w-[300px] lg:w-[340px]">

        <div className="p-3 border-b border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
        </div>

        <div className="flex-1 overflow-hidden p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-md">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 items-center justify-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
