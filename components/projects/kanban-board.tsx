"use client";

import { toneForKey, toneVar, type Tone } from "@/lib/design/tones";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  KanbanCanvas,
  KanbanColumnShell,
  KanbanEmptyDrop,
} from "@/components/shared/kanban";
import { cn } from "@/lib/utils";
import { useUpdateTicketOrder } from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
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
}

export function KanbanBoard({
  tickets,
  projectId,
  projectKey,
  statuses,
  onTicketSelect,
  wipLimits,
}: KanbanBoardProps) {
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [isMounted, setIsMounted] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const queryClient = useQueryClient();

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

  const updateOrder = useUpdateTicketOrder({
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      return { previous: optimisticTickets };
    },
    onError: (
      _err: unknown,
      _newOrder: unknown,
      context: unknown
    ) => {
      const ctx = context as
        | { previous: typeof optimisticTickets }
        | undefined;
      if (ctx?.previous) setOptimisticTickets(ctx.previous);
      toast.error("Failed to update order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
  });

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
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const ticketId = parseInt(draggableId);
      const newStatus = destination.droppableId;
      const newTickets = [...optimisticTickets];
      const movedTicket = {
        ...newTickets.find((t) => t.id === ticketId)!,
        status: newStatus,
      };

      const sourceTickets = newTickets
        .filter((t) => t.status === source.droppableId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const destTickets =
        source.droppableId === destination.droppableId
          ? sourceTickets
          : newTickets
              .filter((t) => t.status === destination.droppableId)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

      const updates: { id: number; status: string; order: number }[] = [];

      if (source.droppableId === destination.droppableId) {
        const items = Array.from(sourceTickets);
        const [reorderedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, reorderedItem);
        items.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({ id: ticket.id, status: ticket.status, order: index });
        });
      } else {
        const sourceItems = Array.from(sourceTickets);
        sourceItems.splice(source.index, 1);
        const destItems = Array.from(destTickets);
        destItems.splice(destination.index, 0, movedTicket);
        destItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex !== -1) {
            newTickets[tIndex] = {
              ...newTickets[tIndex],
              status: newStatus,
              order: index,
            };
            updates.push({ id: ticket.id, status: newStatus, order: index });
          }
        });
        sourceItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({
            id: ticket.id,
            status: ticket.status,
            order: index,
          });
        });
      }

      setOptimisticTickets(newTickets);
      updateOrder.mutate({ projectId, items: updates });
    },
    [optimisticTickets, updateOrder, projectId]
  );

  if (!isMounted) return null;

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <KanbanCanvas className="h-full items-stretch rounded-lg">
        {columns.map((col) => {
          const columnTickets = optimisticTickets
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const wip = wipLimits?.[col.id];
          const overWip = wip != null && columnTickets.length > wip;

          return (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <KanbanColumnShell
                  title={col.name}
                  tone={columnTone(col.id)}
                  color={columnColor(col.id, col.color)}
                  count={columnTickets.length}
                  summary={
                    wip != null ? (
                      <span className={cn(overWip && "font-semibold text-danger-strong")}>
                        {columnTickets.length}/{wip}
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
                    <div className="px-2 pb-2">
                      <QuickAddInput columnId={col.id} projectId={projectId} />
                    </div>
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
