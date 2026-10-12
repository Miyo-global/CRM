"use client";

import { CheckSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { resolveImageUrl } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import { TicketTypeIcon } from "./shared/ticket-type-icon";
import { PriorityBadge } from "./shared/priority-badge";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  priority?: string | null;
  points?: number | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null; image?: string | null } | null;
}

interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusBadge: Record<string, { tone: Tone; label: string }> = {
  TODO: { tone: "neutral", label: "Todo" },
  IN_PROGRESS: { tone: "info", label: "In Progress" },
  IN_REVIEW: { tone: "warning", label: "In Review" },
  DONE: { tone: "success", label: "Done" },
};

export function TableView({ tickets, onTicketClick }: TableViewProps) {
  return (
    <div className="p-4">
      <Table className="min-w-[760px] tabular-nums">
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-28">Priority</TableHead>
            <TableHead className="w-20 text-right">Points</TableHead>
            <TableHead className="w-40">Assignee</TableHead>
            <TableHead className="w-28">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const status = statusBadge[ticket.status] ?? { tone: "neutral" as const, label: ticket.status };
            return (
              <TableRow
                key={ticket.id}
                tabIndex={0}
                onClick={() => onTicketClick(ticket.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onTicketClick(ticket.id);
                }}
                className="cursor-pointer outline-none focus-visible:bg-accent/60"
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {ticket.sequenceId ?? `#${ticket.ticketNumber}`}
                </TableCell>
                <TableCell className="max-w-0 font-medium">
                  <span className="block truncate" title={ticket.title}>
                    {ticket.title}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TicketTypeIcon type={ticket.type} />
                    {ticket.type}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill tone={status.tone} dot>
                    {status.label}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  {ticket.priority && <PriorityBadge priority={ticket.priority} showLabel />}
                </TableCell>
                <TableCell className="text-right text-xs">{ticket.points ?? ""}</TableCell>
                <TableCell>
                  {ticket.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                        <AvatarFallback className="text-3xs">
                          {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs">
                        {ticket.assignee.firstName} {ticket.assignee.lastName?.[0]}.
                      </span>
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {ticket.dueDate
                    ? new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : ""}
                </TableCell>
              </TableRow>
            );
          })}
          {tickets.length === 0 && (
            <TableEmpty colSpan={8} icon={CheckSquare} message="No work items found" />
          )}
        </TableBody>
      </Table>
    </div>
  );
}
