"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Bug, Bookmark, Zap, CheckSquare, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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

const typeIcons: Record<string, typeof CheckSquare> = {
  TASK: CheckSquare,
  BUG: Bug,
  STORY: Bookmark,
  EPIC: Zap,
};

const priorityColors: Record<string, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-blue-400",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

export function ListView({ tickets, onTicketClick, groupBy }: ListViewProps) {
  const grouped = groupBy
    ? tickets.reduce<Record<string, Ticket[]>>((acc, t) => {
        const key = String((t as unknown as Record<string, unknown>)[groupBy] ?? "None");
        (acc[key] ??= []).push(t);
        return acc;
      }, {})
    : { "All Items": tickets };

  return (
    <div className="flex flex-col gap-4 p-4">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          {groupBy && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">{group}</span>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
          )}
          <div className="border rounded-lg divide-y divide-border">
            {items.map((ticket) => {
              const TypeIcon = typeIcons[ticket.type] ?? CheckSquare;
              return (
                <button
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", statusColors[ticket.status] ?? "bg-gray-400")} />
                  <TypeIcon className={cn("h-4 w-4 flex-shrink-0", ticket.type === "BUG" ? "text-red-500" : "text-muted-foreground")} />
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                    {ticket.sequenceId ?? `#${ticket.ticketNumber}`}
                  </span>
                  <span className="text-sm text-foreground truncate flex-1">{ticket.title}</span>
                  {ticket.priority && (
                    <span className={cn("text-xs font-medium flex-shrink-0", priorityColors[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  )}
                  {ticket.points && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">{ticket.points}pt</Badge>
                  )}
                  {ticket.assignee && (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                      <AvatarFallback className="text-[8px]">
                        {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
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
