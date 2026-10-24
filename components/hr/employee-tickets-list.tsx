"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ListTodo } from "lucide-react";
import { ticketStatusLabel } from "@/lib/labels";

type Ticket = {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  updatedAt: Date | string | null;
  ticketNumber?: number | null;
  sequenceId?: string | null;
  project: {
    id: number;
    name: string;
    key: string;
  } | null;
  sprint: {
    name: string;
  } | null;
};

interface EmployeeTicketsListProps {
  tickets: Ticket[];
}

const priorityColors: Record<string, string> = {
  URGENT: "bg-danger-soft text-danger-strong",
  HIGH: "bg-warning-soft text-warning-strong",
  MEDIUM: "bg-brand-soft text-brand-soft-foreground",
  LOW: "bg-neutral-soft text-neutral-strong",
};

function formatTicketKey(ticket: Ticket): string {
  if (ticket.sequenceId?.trim()) return ticket.sequenceId.trim();
  if (ticket.project?.key && ticket.ticketNumber != null) {
    return `${ticket.project.key}-${ticket.ticketNumber}`;
  }
  if (ticket.ticketNumber != null) return `#${ticket.ticketNumber}`;
  return `#${ticket.id}`;
}

function ticketHref(ticket: Ticket): string | null {
  if (!ticket.project?.id) return null;
  return `/projects/${ticket.project.id}?ticket=${ticket.id}`;
}

export function EmployeeTicketsList({ tickets }: EmployeeTicketsListProps) {
  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState compact icon={ListTodo} title="No assigned tickets found." />
    );
  }

  return (
    <div className="space-y-2 max-h-[min(28rem,60vh)] overflow-y-auto pr-1">
      {tickets.map((ticket) => {
        const href = ticketHref(ticket);
        const key = formatTicketKey(ticket);
        const priority = ticket.priority ?? "MEDIUM";
        const updatedLabel = ticket.updatedAt
          ? format(new Date(ticket.updatedAt), "MMM d, yyyy")
          : null;

        const content = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
                  <span className="font-mono text-2xs text-muted-foreground">{key}</span>
                  {ticket.project && (
                    <span className="truncate max-w-40" title={ticket.project.name}>
                      {ticket.project.name}
                    </span>
                  )}
                  {ticket.sprint?.name && (
                    <span className="truncate max-w-32" title={ticket.sprint.name}>
                      · {ticket.sprint.name}
                    </span>
                  )}
                  {updatedLabel && <span>· {updatedLabel}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant="outline">
                  {ticketStatusLabel(ticket.status)}
                </Badge>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-2xs font-semibold",
                    priorityColors[priority] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {priority}
                </span>
              </div>
            </div>
          </>
        );

        if (href) {
          return (
            <Link
              key={ticket.id}
              href={href}
              className="block rounded-lg border border-border bg-card px-3 py-2.5 outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:focus-ring"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={ticket.id}
            className="rounded-lg border border-border bg-card px-3 py-2.5"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
