"use client";

import { useCallback, type ReactNode } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { KanbanCanvas, KanbanEmptyDrop, kanbanCardClass } from "@/components/shared/kanban";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/design/tones";
import type { SprintData } from "./sprint-card";

interface PlanningTicket {
  id: number;
  title?: string;
  status: string | null;
  points: number | null;
  sprintId?: number | null;
  type?: string | null;
}

interface SprintPlanningPanelProps {
  sprint: SprintData;
  backlogTickets: PlanningTicket[];
  onDragEnd: (result: DropResult) => void;
  onDone: () => void;
}

/** Column chrome per §8.4; kept local so the droppable div keeps its aria-label. */
function ColumnHeader({ title, tone, count }: { title: ReactNode; tone: Tone; count: number }) {
  return (
    <div className="flex h-11 items-center gap-2 px-3">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", toneDot[tone])} />
      <h4 className="min-w-0 truncate text-sm font-semibold">{title}</h4>
      <Badge variant="secondary" className="tabular-nums">{count}</Badge>
    </div>
  );
}

const columnClass = "flex w-72 shrink-0 snap-start flex-col rounded-lg bg-muted/60 sm:w-auto sm:min-w-0 sm:flex-1 sm:shrink";
const dropAreaClass = (isDraggingOver: boolean) =>
  cn(
    "min-h-48 flex-1 space-y-2 rounded-b-lg p-2 transition-colors",
    isDraggingOver && "bg-brand-soft/60 ring-1 ring-gold-300 ring-inset"
  );

function TicketCardBody({ ticket }: { ticket: { title?: string; points: number | null } }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="line-clamp-2 text-sm font-medium">{ticket.title}</span>
      {ticket.points != null && (
        <Badge variant="secondary" className="shrink-0 tabular-nums">{ticket.points}</Badge>
      )}
    </div>
  );
}

export function SprintPlanningPanel({ sprint, backlogTickets, onDragEnd, onDone }: SprintPlanningPanelProps) {
  const handleDone = useCallback(() => onDone(), [onDone]);
  const sprintTickets = sprint.tickets || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border py-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <IconChip icon={ArrowRightLeft} tone="brand" size="sm" />
          <span className="truncate">Planning: {sprint.name}</span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleDone}>
          Done Planning
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <KanbanCanvas>
            <div className={columnClass}>
              <ColumnHeader title="Backlog" tone="neutral" count={backlogTickets.length} />
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label="Backlog tickets"
                    className={dropAreaClass(snapshot.isDraggingOver)}
                  >
                    {backlogTickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={kanbanCardClass(dragSnapshot.isDragging)}
                          >
                            <TicketCardBody ticket={ticket} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {backlogTickets.length === 0 && <KanbanEmptyDrop label="No backlog tickets" />}
                  </div>
                )}
              </Droppable>
            </div>
            <div className={columnClass}>
              <ColumnHeader title={sprint.name} tone="brand" count={sprintTickets.length} />
              <Droppable droppableId={sprint.id.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label={`${sprint.name} tickets`}
                    className={dropAreaClass(snapshot.isDraggingOver)}
                  >
                    {sprintTickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={kanbanCardClass(dragSnapshot.isDragging)}
                          >
                            <TicketCardBody ticket={ticket} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {sprintTickets.length === 0 && <KanbanEmptyDrop label="Drag tickets here" />}
                  </div>
                )}
              </Droppable>
            </div>
          </KanbanCanvas>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
