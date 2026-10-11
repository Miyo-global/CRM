"use client";

import { useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TicketTypeIcon } from "./shared/ticket-type-icon";
import { PriorityBadge } from "./shared/priority-badge";
import type { KanbanTicket } from "./shared/types";
import { motion } from "framer-motion";
import { kanbanCardClass } from "@/components/shared/kanban";

interface KanbanTicketCardProps {
  ticket: KanbanTicket;
  projectKey?: string;
  isDragging: boolean;
  dragStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
}

export const KanbanTicketCard = memo(function KanbanTicketCard({
  ticket,
  projectKey,
  isDragging,
  dragStartRef,
  onSelect,
}: KanbanTicketCardProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [dragStartRef]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragStartRef.current) {
        const moved =
          Math.abs(e.clientX - dragStartRef.current.x) > 5 ||
          Math.abs(e.clientY - dragStartRef.current.y) > 5;
        dragStartRef.current = null;
        if (!moved) onSelect(ticket.id);
      } else {
        onSelect(ticket.id);
      }
    },
    [ticket.id, onSelect, dragStartRef]
  );

  const ticketKey = projectKey
    ? `${projectKey}-${ticket.ticketNumber}`
    : `#${ticket.ticketNumber ?? ticket.id}`;

  const primaryAssignee =
    ticket.assignees?.[0]?.user ?? ticket.assignee ?? null;

  const points = ticket.points ?? ticket.storyPoints;
  const labels = (ticket.labels ?? []).filter((l) => l.label);

  return (
    <motion.div
      layoutId={`ticket-${ticket.id}`}
      className={cn(
        kanbanCardClass(isDragging),
        "cursor-grab space-y-2 active:cursor-grabbing"
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5">
        <TicketTypeIcon type={ticket.type} />
        <span className="truncate font-mono text-2xs text-muted-foreground">
          {ticketKey}
        </span>
        {points != null && points > 0 && (
          <Badge variant="secondary" className="ml-auto font-mono tabular-nums">
            {points}
          </Badge>
        )}
      </div>

      <p className="line-clamp-2 text-sm font-medium leading-snug">
        {ticket.title}
      </p>

      <div className="flex items-center gap-1.5">
        {primaryAssignee ? (
          <Avatar className="size-5 shrink-0">
            <AvatarImage src={resolveImageUrl(primaryAssignee.image)} />
            <AvatarFallback className="bg-brand-soft text-3xs font-medium text-brand-soft-foreground">
              {primaryAssignee.firstName?.[0]}
              {primaryAssignee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong bg-muted">
            <span className="text-3xs text-muted-foreground">?</span>
          </div>
        )}
        <PriorityBadge priority={ticket.priority} />

        {labels.length > 0 && (
          <div className="flex min-w-0 items-center gap-1">
            {labels.slice(0, 2).map(({ label }) => (
              <span
                key={label!.id}
                title={label!.name}
                className="inline-flex h-5 min-w-0 max-w-24 items-center gap-1 rounded-full border border-border px-1.5 text-2xs text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: label!.color || "var(--info-500)" }}
                />
                <span className="truncate">{label!.name}</span>
              </span>
            ))}
            {labels.length > 2 && (
              <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
                +{labels.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export type { KanbanTicket, KanbanColumn } from "./shared/types";
