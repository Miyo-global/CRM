"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { formatINRCompact } from "@/lib/format-utils";
import { KanbanCanvas, KanbanColumnShell, KanbanEmptyDrop } from "@/components/shared/kanban";
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
    <DragDropContext onDragEnd={onDragEnd}>
      <KanbanCanvas className="min-h-full rounded-lg">
        {STATUSES.map((status) => {
          const config = STATUS_CONFIG[status];
          const columnLeads: BoardLead[] = filteredBoard?.[status] ?? [];
          const total = columnLeads.reduce((s, l) => s + Number(l.potentialValue || 0), 0);

          return (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <KanbanColumnShell
                  title={config.label}
                  tone={config.tone}
                  count={columnLeads.length}
                  summary={total > 0 ? formatINRCompact(total) : undefined}
                  isDraggingOver={snapshot.isDraggingOver}
                  innerRef={provided.innerRef}
                  droppableProps={provided.droppableProps}
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
                  {columnLeads.length === 0 && !snapshot.isDraggingOver && <KanbanEmptyDrop label="No leads" />}
                </KanbanColumnShell>
              )}
            </Droppable>
          );
        })}
      </KanbanCanvas>
    </DragDropContext>
  );
}
