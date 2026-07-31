"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ListTodo } from "lucide-react";

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
  URGENT: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900",
  LOW: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800",
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
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center text-muted-foreground">
        <ListTodo className="h-8 w-8 mb-2 opacity-40" aria-hidden="true" />
        <p className="text-sm">No assigned tickets found.</p>
      </div>
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
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] text-muted-foreground/90">{key}</span>
                  {ticket.project && (
                    <span className="truncate max-w-[10rem]" title={ticket.project.name}>
                      {ticket.project.name}
                    </span>
                  )}
                  {ticket.sprint?.name && (
                    <span className="truncate max-w-[8rem]" title={ticket.sprint.name}>
                      · {ticket.sprint.name}
                    </span>
                  )}
                  {updatedLabel && <span>· {updatedLabel}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ticket.status.replace(/_/g, " ")}
                </Badge>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                    priorityColors[priority] ?? "bg-muted text-muted-foreground border-border",
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
              className="block rounded-lg border bg-muted/20 px-3 py-2.5 hover:bg-muted/40 hover:border-primary/30 transition-colors"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={ticket.id}
            className="rounded-lg border bg-muted/20 px-3 py-2.5"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
