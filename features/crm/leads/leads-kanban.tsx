"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_CONFIG } from "./leads-constants";
import type { BoardLead, LeadStatus } from "./leads-types";
import { KanbanCard } from "./kanban-card";

interface LeadsKanbanProps {
  filteredBoard: Record<string, BoardLead[]> | null;
  onDragEnd: (result: DropResult) => void;
  onOpenLead: (id: number) => void;
  onMoveStatus: (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => void;
}

export function LeadsKanban({ filteredBoard, onDragEnd, onOpenLead, onMoveStatus }: LeadsKanbanProps) {
  return (
    <div className="overflow-x-auto pb-4 -mx-2 px-2">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 min-w-[900px] lg:min-w-0">
          {STATUSES.map((status) => {
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const columnLeads: BoardLead[] = filteredBoard?.[status] ?? [];

            return (
              <div key={status} className="flex-1 min-w-[160px] sm:min-w-[180px] md:min-w-[200px]">
                <div className={cn("rounded-xl border h-full flex flex-col", config.border, "bg-muted/20")}>

                  <div className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b",
                    config.border,
                    config.bg,
                  )}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn("h-4 w-4", config.color)} />
                      <h3 className={cn("text-sm font-semibold", config.color)}>{config.label}</h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs tabular-nums h-5 min-w-[20px] flex items-center justify-center"
                    >
                      {columnLeads.length}
                    </Badge>
                  </div>

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto transition-colors duration-200",
                          snapshot.isDraggingOver && "bg-gold/5 ring-1 ring-inset ring-gold/20 rounded-b-xl",
                        )}
                      >
                        {columnLeads.map((lead: BoardLead, index: number) => (
                          <KanbanCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            status={status}
                            onOpen={onOpenLead}
                            onMoveStatus={onMoveStatus}
                          />
                        ))}
                        {provided.placeholder}

                        {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-muted-foreground/40">
                            <p className="text-xs">No leads</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
