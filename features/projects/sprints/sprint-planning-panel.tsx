"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
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

export function SprintPlanningPanel({ sprint, backlogTickets, onDragEnd, onDone }: SprintPlanningPanelProps) {
  const handleDone = useCallback(() => onDone(), [onDone]);

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m16 3 4 4-4 4" />
              <path d="M20 7H4" />
              <path d="m8 21-4-4 4-4" />
              <path d="M4 17h16" />
            </svg>
            Planning: {sprint.name}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleDone}>
            Done Planning
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Backlog ({backlogTickets.length})</h4>
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label="Backlog tickets"
                    className={cn(
                      "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                    )}
                  >
                    {backlogTickets.map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="p-2 bg-card rounded border text-sm flex items-center justify-between"
                          >
                            <span className="truncate">{ticket.title}</span>
                            {ticket.points != null && (
                              <Badge variant="secondary" className="text-xs ml-2 shrink-0">{ticket.points}</Badge>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {backlogTickets.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">No backlog tickets</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">{sprint.name} ({(sprint.tickets || []).length})</h4>
              <Droppable droppableId={sprint.id.toString()}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    aria-label={`${sprint.name} tickets`}
                    className={cn(
                      "min-h-[200px] rounded-lg border border-dashed p-2 space-y-1",
                      snapshot.isDraggingOver && "bg-primary/5 border-primary/30"
                    )}
                  >
                    {(sprint.tickets || []).map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={ticket.id.toString()} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="p-2 bg-card rounded border text-sm flex items-center justify-between"
                          >
                            <span className="truncate">{ticket.title}</span>
                            {ticket.points != null && (
                              <Badge variant="secondary" className="text-xs ml-2 shrink-0">{ticket.points}</Badge>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {(sprint.tickets || []).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Drag tickets here</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
