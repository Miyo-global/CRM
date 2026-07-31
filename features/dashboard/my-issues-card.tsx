"use client";

import { memo } from "react";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import { isTicketType, typeIcons, DEFAULT_TICKET_ICON } from "./ticket-types";

const MAX_VISIBLE_TICKETS = 10;

export interface DashboardTicket {
  id: string | number;
  type?: string | null;
  status?: string | null;
  ticketNumber?: number | string;
  title?: string | null;
  priority?: string | null;
  project?: {
    id?: number;
    key?: string;
    name?: string;
  } | null;
}

interface MyIssuesCardProps {
  tickets: DashboardTicket[];
  isLoading: boolean;
  error: unknown;
}

export const MyIssuesCard = memo(function MyIssuesCard({ tickets, isLoading, error }: MyIssuesCardProps) {
  return (
    <Card className="bg-card border-border shadow-noir flex flex-col h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0 px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <ListTodo className="h-4 w-4 text-gold" aria-hidden="true" />
          My Issues
        </CardTitle>
        <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">
          {tickets.length} open
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`ticket-skel-${i}`} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">Failed to load issues.</p>
        ) : tickets.length > 0 ? (
          <ScrollArea className="h-full pr-2">
          <div className="space-y-1.5">
            {tickets.slice(0, MAX_VISIBLE_TICKETS).map((ticket) => {
              const TypeIcon = isTicketType(ticket.type) ? typeIcons[ticket.type] : DEFAULT_TICKET_ICON;
              const project = ticket.project;
              return (
                <Link key={ticket.id} href={project?.id ? `/projects/${project.id}` : "/projects"}>
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 hover:border-gold/30 transition-colors cursor-pointer">
                    <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {project?.key && ticket.ticketNumber != null && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {project.key}-{ticket.ticketNumber}
                          </span>
                        )}
                        <span className="font-medium text-sm text-foreground truncate">{ticket.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={getColorSafe(priorityColors, ticket.priority || "MEDIUM")}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={ticket.status === "IN_PROGRESS" || ticket.status === "IN_REVIEW" ? "default" : "secondary"} className="text-xs">
                        {ticket.status?.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          </ScrollArea>
        ) : (
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="No assigned issues"
            description="Issues assigned to you will appear here."
          />
        )}
      </CardContent>
    </Card>
  );
});
