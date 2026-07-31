"use client";

import { memo } from "react";
import Link from "next/link";
import { Activity, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import { formatDistanceToNow } from "date-fns";
import { isTicketType, typeIcons, DEFAULT_TICKET_ICON } from "./ticket-types";

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

export const RecentActivityCard = memo(function RecentActivityCard({ items, isLoading, error }: RecentActivityCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir flex flex-col h-full w-full">
      <CardHeader className="flex-shrink-0 px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-gold" aria-hidden="true" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`activity-skel-${i}`} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">Failed to load activity.</p>
        ) : items && items.length > 0 ? (
          <ScrollArea className="h-full pr-2">
            <div className="space-y-1.5">
              {items.map((item) => {
                if (item.activityKind === "org" || item.type === "branch") {
                  return (
                    <Link key={item.id} href="/dashboard/branches">
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <GitBranch className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200">
                              Branch
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.actorName && (
                              <span className="text-xs text-muted-foreground">by {item.actorName}</span>
                            )}
                            {item.updatedAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }

                const TypeIcon = isTicketType(item.type) ? typeIcons[item.type] : DEFAULT_TICKET_ICON;
                return (
                  <Link key={item.id} href={item.projectId ? `/projects/${item.projectId}` : "/projects"}>
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <TypeIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.projectKey && item.ticketNumber != null && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.projectKey}-{item.ticketNumber}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.status?.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.projectName}</span>
                          {item.updatedAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.assignee && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={resolveImageUrl(item.assignee.image)} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(null, item.assignee.firstName, item.assignee.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title="No recent activity"
            description="Ticket updates and branch changes will appear here."
          />
        )}
      </CardContent>
    </Card>
  );
});
