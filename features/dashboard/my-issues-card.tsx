"use client";

import { memo } from "react";
import { ListTodo } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import type { Tone } from "@/lib/design/tones";
import { isTicketType, typeIcons, typeTones, DEFAULT_TICKET_ICON } from "./ticket-types";

const MAX_VISIBLE_TICKETS = 6;

const priorityTone: Record<string, Tone> = { URGENT: "danger", HIGH: "warning", MEDIUM: "brand", LOW: "neutral" };

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
  /** Optional retry for the error state. */
  onRetry?: () => void;
}

export const MyIssuesCard = memo(function MyIssuesCard({ tickets, isLoading, error, onRetry }: MyIssuesCardProps) {
  return (
    <WidgetCard
      title="My issues"
      icon={ListTodo}
      tone="info"
      actions={
        <StatusPill tone="brand" className="tabular-nums">
          {tickets.length} open
        </StatusPill>
      }
      viewAllHref={tickets.length > MAX_VISIBLE_TICKETS ? "/projects" : undefined}
    >
      <div aria-live="polite">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`ticket-skel-${i}`} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <WidgetError error={error} onRetry={onRetry} />
        ) : tickets.length > 0 ? (
          <ul className="-mx-2">
            {tickets.slice(0, MAX_VISIBLE_TICKETS).map((ticket) => {
              const type = isTicketType(ticket.type) ? ticket.type : null;
              const TypeIcon = type ? typeIcons[type] : DEFAULT_TICKET_ICON;
              const project = ticket.project;
              const inFlight = ticket.status === "IN_PROGRESS" || ticket.status === "IN_REVIEW";
              return (
                <li key={ticket.id}>
                  <WidgetListRow
                    href={project?.id ? `/projects/${project.id}` : "/projects"}
                    title={
                      <>
                        {project?.key && ticket.ticketNumber != null && (
                          <span className="mr-1.5 font-mono text-xs font-normal text-muted-foreground">
                            {project.key}-{ticket.ticketNumber}
                          </span>
                        )}
                        {ticket.title}
                      </>
                    }
                    meta={project?.name}
                    trailing={
                      <>
                        {ticket.priority && (
                          <StatusPill tone={priorityTone[ticket.priority] ?? "brand"} className="hidden sm:inline-flex">
                            {ticket.priority}
                          </StatusPill>
                        )}
                        <StatusPill tone={inFlight ? "info" : "neutral"} dot>
                          {ticket.status?.replaceAll("_", " ")}
                        </StatusPill>
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
            title="No assigned issues"
            description="Issues assigned to you will appear here."
          />
        )}
      </div>
    </WidgetCard>
  );
});
