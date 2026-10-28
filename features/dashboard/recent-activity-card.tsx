"use client";

import { memo } from "react";
import { Activity } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { format, formatDistanceToNow } from "date-fns";

const MAX_ROWS = 6;

export interface ActivityItem {
  id: string | number;
  type?: string | null;
  status?: string | null;
  ticketNumber?: number | string;
  title?: string | null;
  projectId?: number | null;
  projectKey?: string | null;
  projectName?: string | null;
  updatedAt?: string | Date | null;
  assignee?: {
    image?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  activityKind?: "ticket" | "org";
  actorName?: string | null;
}

interface RecentActivityCardProps {
  items: ActivityItem[] | undefined;
  isLoading: boolean;
  error: unknown;
}

function RelativeTime({ value }: { value: string | Date }) {
  const d = new Date(value);
  return (
    <time dateTime={d.toISOString()} title={format(d, "PPpp")}>
      {formatDistanceToNow(d, { addSuffix: true })}
    </time>
  );
}

export const RecentActivityCard = memo(function RecentActivityCard({ items, isLoading, error }: RecentActivityCardProps) {
  return (
    <WidgetCard title="Recent activity" icon={Activity} tone="teal">
      <div aria-live="polite">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`activity-skel-${i}`} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <WidgetError error={error} />
        ) : items && items.length > 0 ? (
          <ul className="-mx-2">
            {items.slice(0, MAX_ROWS).map((item) => {
              return (
                <li key={item.id}>
                  <WidgetListRow
                    href={item.projectId ? `/projects/${item.projectId}` : "/projects"}
                    title={
                      <>
                        {item.projectKey && item.ticketNumber != null && (
                          <span className="mr-1.5 font-mono text-xs font-normal text-muted-foreground">
                            {item.projectKey}-{item.ticketNumber}
                          </span>
                        )}
                        {item.title}
                      </>
                    }
                    meta={
                      <>
                        {item.projectName}
                        {item.updatedAt && <> · <RelativeTime value={item.updatedAt} /></>}
                      </>
                    }
                    trailing={
                      <>
                        {item.status && (
                          <StatusPill tone="neutral" className="hidden sm:inline-flex">
                            {item.status.replaceAll("_", " ")}
                          </StatusPill>
                        )}
                        {item.assignee && (
                          <Avatar className="size-6">
                            <AvatarImage src={resolveImageUrl(item.assignee.image)} />
                            <AvatarFallback className="text-3xs">
                              {getInitials(null, item.assignee.firstName, item.assignee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            compact
            title="No recent activity"
            description="Ticket updates and branch changes will appear here."
          />
        )}
      </div>
    </WidgetCard>
  );
});
