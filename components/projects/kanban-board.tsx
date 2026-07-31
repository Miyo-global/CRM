"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
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
  { id: "TODO", name: "To Do", color: "#94a3b8", order: 0 },
  { id: "IN_PROGRESS", name: "In Progress", color: "#3b82f6", order: 1 },
  { id: "IN_REVIEW", name: "In Review", color: "#eab308", order: 2 },
  { id: "DONE", name: "Done", color: "#22c55e", order: 3 },
];

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

      <div className="flex gap-3 h-full overflow-x-auto overflow-y-hidden pb-1 px-1">
        {columns.map((col) => {
          const columnTickets = optimisticTickets
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const wip = wipLimits?.[col.id];
          const overWip = wip != null && columnTickets.length > wip;

          return (
            <div
              key={col.id}
              className={cn(
                "rounded-lg border bg-muted/20 min-w-[272px] w-[272px] flex flex-col flex-shrink-0 h-full",
                overWip && "border-red-400/60"
              )}
            >

              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: col.color || "#94a3b8" }}
                  />
                  <h3 className="font-medium text-[13px] text-foreground truncate">
                    {col.name}
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {columnTickets.length}
                    {wip != null && `/${wip}`}
                  </span>
                </div>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 overflow-y-auto min-h-[100px] px-2 pb-2 space-y-1.5 transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {columnTickets.length === 0 &&
                        !snapshot.isDraggingOver && (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                          >
                            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                              <Plus className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Drop tickets here
                            </p>
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
                  </div>
                )}
              </Droppable>

              <div className="border-t">
                <QuickAddInput columnId={col.id} projectId={projectId} />
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
