"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resolveImageUrl, cn } from "@/lib/utils";

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

const statusBadge: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  TODO: { variant: "secondary", label: "Todo" },
  IN_PROGRESS: { variant: "default", label: "In Progress" },
  IN_REVIEW: { variant: "outline", label: "In Review" },
  DONE: { variant: "secondary", label: "Done" },
};

const priorityColors: Record<string, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-blue-400",
};

export function TableView({ tickets, onTicketClick }: TableViewProps) {
  return (
    <div className="p-4">
      <ScrollArea className="w-full border rounded-lg overflow-hidden" type="auto">
        <div className="min-w-[700px]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-20">Points</TableHead>
              <TableHead className="w-32">Assignee</TableHead>
              <TableHead className="w-28">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const status = statusBadge[ticket.status] ?? { variant: "secondary" as const, label: ticket.status };
              return (
                <TableRow
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {ticket.sequenceId ?? `#${ticket.ticketNumber}`}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{ticket.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{ticket.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.priority && (
                      <span className={cn("text-xs font-medium", priorityColors[ticket.priority])}>
                        {ticket.priority}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{ticket.points ?? ""}</TableCell>
                  <TableCell>
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                          <AvatarFallback className="text-[7px]">
                            {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">
                          {ticket.assignee.firstName} {ticket.assignee.lastName?.[0]}.
                        </span>
                      </div>
                    ) : (
                      null
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {ticket.dueDate
                      ? new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : ""}
                  </TableCell>
                </TableRow>
              );
            })}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No work items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
