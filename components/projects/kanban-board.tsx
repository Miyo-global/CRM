"use client";

import { toneForKey, toneVar, type Tone } from "@/lib/design/tones";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  KanbanCanvas,
  KanbanColumnShell,
  KanbanEmptyDrop,
} from "@/components/shared/kanban";
import { cn } from "@/lib/utils";
import { useRankTicket } from "@/lib/hooks/trpc-hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { computeRank, effectiveRank } from "@/lib/projects/ticket-rank";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { QuickAddInput } from "./kanban-quick-add";
import type { KanbanTicket, KanbanColumn } from "./shared/types";
import { AnimatePresence, motion } from "framer-motion";

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "TODO", name: "To Do", color: toneVar.neutral, order: 0 },
  { id: "IN_PROGRESS", name: "In Progress", color: toneVar.info, order: 1 },
  { id: "IN_REVIEW", name: "In Review", color: toneVar.warning, order: 2 },
  { id: "DONE", name: "Done", color: toneVar.success, order: 3 },
];

const STATUS_TONES: Record<string, Tone> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  IN_REVIEW: "warning",
  DONE: "success",
  CANCELLED: "danger",
};

const statusKey = (id: string) => id.toUpperCase().replace(/\s+/g, "_");
const columnTone = (id: string): Tone =>
  STATUS_TONES[statusKey(id)] ?? toneForKey(id);
// Built-in statuses use tones; custom statuses keep their stored colour (user data).
const columnColor = (id: string, color: string | null | undefined) =>
  STATUS_TONES[statusKey(id)] ? undefined : color;

interface KanbanBoardProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  statuses?: Array<{
    id: number;
    name: string;
    color: string | null;
    order: number;
  }>;
  epics?: Array<{ id: number; title: string }>;
  onTicketSelect?: (ticketId: number) => void;
  wipLimits?: Record<string, number>;
  columnCounts?: Record<string, number>;
  readOnly?: boolean;
}

function sortByRank(list: KanbanTicket[]) {
  return [...list].sort(
    (a, b) =>
      effectiveRank(a.rank ?? null, a.order ?? null) - effectiveRank(b.rank ?? null, b.order ?? null) || a.id - b.id,
  );
}

export function KanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
  columnCounts,
  readOnly = false,
}: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const columns: KanbanColumn[] =
    statuses && statuses.length > 0
      ? statuses.map((s) => ({
          id: s.name,
          name: s.name.replace(/_/g, " "),
          color: s.color,
          order: s.order,
        }))
      : DEFAULT_COLUMNS;

  useEffect(() => {
    setOptimisticTickets(tickets);
  }, [tickets]);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const rankTicket = useRankTicket(projectId);

  const handleSelect = useCallback(
    (id: number) => {
      onTicketSelect?.(id);
    },
    [onTicketSelect]
  );

  const onDragStart = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      dragStartRef.current = null;
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const ticketId = parseInt(draggableId);
      const moved = optimisticTickets.find((t) => t.id === ticketId);
      if (!moved) return;
      const status = destination.droppableId;

      const destList = sortByRank(optimisticTickets.filter((t) => t.status === status && t.id !== ticketId));
      const before = destList[destination.index - 1];
      const after = destList[destination.index];
      const placed = computeRank(
        before ? effectiveRank(before.rank ?? null, before.order ?? null) : null,
        after ? effectiveRank(after.rank ?? null, after.order ?? null) : null,
      );
      const optimisticRank = String("rank" in placed ? placed.rank : effectiveRank(before?.rank ?? null, before?.order ?? null));

      const previous = optimisticTickets;
      setOptimisticTickets((current) =>
        current.map((t) => (t.id === ticketId ? { ...t, status, rank: optimisticRank } : t)),
      );
      rankTicket.mutate(
        { ticketId, status, beforeTicketId: before?.id, afterTicketId: after?.id, optimisticRank },
        {
          onError: (error) => {
            setOptimisticTickets(previous);
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [optimisticTickets, rankTicket]
  );

  if (!isMounted) return null;

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <KanbanCanvas className="h-full items-stretch rounded-lg">
        {columns.map((col) => {
          const columnTickets = sortByRank(optimisticTickets.filter((t) => t.status === col.id));
          const total = columnCounts?.[col.id] ?? columnTickets.length;

          const wip = wipLimits?.[col.id];
          const overWip = wip != null && total > wip;

          return (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <KanbanColumnShell
                  title={col.name}
                  tone={columnTone(col.id)}
                  color={columnColor(col.id, col.color)}
                  count={total}
                  summary={
                    wip != null ? (
                      <span
                        className={cn(overWip && "font-semibold text-danger-strong")}
                        aria-label={`${total} of ${wip} allowed in this column`}
                      >
                        {total}/{wip}
                      </span>
                    ) : undefined
                  }
                  isDraggingOver={snapshot.isDraggingOver}
                  innerRef={provided.innerRef}
                  droppableProps={provided.droppableProps}
                  className={cn(
                    "max-h-full [&>[data-rfd-droppable-id]]:overflow-y-auto",
                    overWip && "ring-1 ring-danger-500 ring-inset"
                  )}
                  footer={
                    readOnly ? undefined : (
                      <div className="px-2 pb-2">
                        <QuickAddInput columnId={col.id} projectId={projectId} />
                      </div>
                    )
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {columnTickets.length === 0 && !snapshot.isDraggingOver && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <KanbanEmptyDrop label="Drop tickets here" />
                      </motion.div>
                    )}
                    {columnTickets.map((ticket, index) => (
                      <Draggable
                        key={ticket.id}
                        draggableId={ticket.id.toString()}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(draggableProvided, draggableSnapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                            style={{
                              ...draggableProvided.draggableProps.style,
                            }}
                            className="rounded-md outline-none focus-visible:focus-ring"
                          >
                            <KanbanTicketCard
                              ticket={ticket}
                              projectKey={projectKey}
                              isDragging={draggableSnapshot.isDragging}
                              dragStartRef={dragStartRef}
                              onSelect={handleSelect}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </KanbanColumnShell>
              )}
            </Droppable>
          );
        })}
      </KanbanCanvas>
    </DragDropContext>
  );
}
