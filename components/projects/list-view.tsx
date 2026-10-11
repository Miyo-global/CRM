"use client";

import { CheckSquare, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { resolveImageUrl } from "@/lib/utils";
import { TicketTypeIcon } from "./shared/ticket-type-icon";
import { PriorityBadge } from "./shared/priority-badge";
import { StatusBadge } from "./shared/status-badge";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null; image?: string | null } | null;
}

interface ListViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
  groupBy?: string;
}

export function ListView({ tickets, onTicketClick, groupBy }: ListViewProps) {
  const grouped = groupBy
    ? tickets.reduce<Record<string, Ticket[]>>((acc, t) => {
        const key = String((t as unknown as Record<string, unknown>)[groupBy] ?? "None");
        (acc[key] ??= []).push(t);
        return acc;
      }, {})
    : { "All Items": tickets };

  return (
    <div className="flex flex-col gap-6 p-4">
      {Object.entries(grouped).map(([group, items]) => (
        <section key={group} className="space-y-2">
          {groupBy && (
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{group}</h3>
              <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
            </div>
          )}
          <Table className="min-w-[640px]">
            <TableBody>
              {items.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  tabIndex={0}
                  onClick={() => onTicketClick(ticket.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onTicketClick(ticket.id);
                  }}
                  className="cursor-pointer outline-none focus-visible:bg-accent/60"
                >
                  <TableCell className="w-8 pr-0">
                    <TicketTypeIcon type={ticket.type} />
                  </TableCell>
                  <TableCell className="w-24 font-mono text-xs text-muted-foreground">
                    {ticket.sequenceId ?? `#${ticket.ticketNumber}`}
                  </TableCell>
                  <TableCell className="max-w-0">
                    <span className="block truncate" title={ticket.title}>
                      {ticket.title}
                    </span>
                  </TableCell>
                  <TableCell className="w-32">
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="w-8">
                    {ticket.priority && <PriorityBadge priority={ticket.priority} />}
                  </TableCell>
                  <TableCell className="w-16 text-right">
                    {ticket.points ? (
                      <Badge variant="outline" className="tabular-nums">{ticket.points}pt</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="w-10">
                    {ticket.assignee && (
                      <Avatar className="size-6">
                        <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                        <AvatarFallback className="text-3xs">
                          {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell className="w-8 pl-0">
                    <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
      {tickets.length === 0 && (
        <EmptyState
          compact
          icon={CheckSquare}
          title="No work items found"
          description="There are no work items to show here yet."
          className="border-0 bg-transparent"
        />
      )}
    </div>
  );
}
