"use client";

import { formatDistanceToNow } from "date-fns";
import { parseDbTimestamp } from "@/lib/date-utils";
import { History } from "lucide-react";
import type { useProjectActivity } from "@/lib/api/hooks/projects/activity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { actorName, describeActivity } from "./activity-text";

type Props = {
  query: ReturnType<typeof useProjectActivity>;
  showTicket?: boolean;
  projectKey?: string;
  onTicketClick?: (ticketId: number) => void;
};

export function ActivityList({ query, showTicket = false, projectKey, onTicketClick }: Props) {
  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  const items = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => refetch()} />;
  if (items.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Changes to tickets show up here as people work." />;
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-border" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-foreground">
                <span className="font-medium">{actorName(item.actor)}</span> {describeActivity(item)}
                {showTicket && (
                  <>
                    {" on "}
                    <button
                      type="button"
                      onClick={() => onTicketClick?.(item.ticketId)}
                      className="rounded-sm font-medium text-brand-text hover:underline focus-visible:focus-ring"
                    >
                      {projectKey ? `${projectKey}-${item.ticketNumber}` : item.ticketTitle}
                    </button>
                  </>
                )}
              </p>
              <time dateTime={item.createdAt} className="text-xs text-muted-foreground">
                {formatDistanceToNow(parseDbTimestamp(item.createdAt), { addSuffix: true })}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {hasNextPage && (
        <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
          Show older activity
        </Button>
      )}
    </div>
  );
}
