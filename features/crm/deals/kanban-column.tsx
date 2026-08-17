"use client";

import { memo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types/crm";
import { DealKanbanCard } from "@/features/crm/deals/deal-kanban-card";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

interface KanbanColumnStage {
  key: string;
  label: string;
  dot: string;
}

interface KanbanColumnProps {
  stage: KanbanColumnStage;
  deals: Deal[];
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
}

const KanbanDraggableCard = memo(function KanbanDraggableCard({
  deal,
  index,
  onStageChange,
  onDelete,
  onOpen,
}: {
  deal: Deal;
  index: number;
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
}) {
  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={cn(dragSnapshot.isDragging && "opacity-80 shadow-lg")}
        >
          <DealKanbanCard
            deal={deal}
            onStageChange={onStageChange}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        </div>
      )}
    </Draggable>
  );
});

export const KanbanColumn = memo(function KanbanColumn({
  stage,
  deals,
  onStageChange,
  onDelete,
  onOpen,
}: KanbanColumnProps) {
  const stageValue = deals.reduce((s, d) => s + Number(d.value || 0), 0);

  return (
    <div className="w-56 sm:w-64 md:w-72 flex-shrink-0">
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", stage.dot)} />
          <span className="text-sm font-semibold">{stage.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 pl-[18px]">
          {deals.length} {deals.length === 1 ? "deal" : "deals"}
          {stageValue > 0 && (
            <> · ₹{stageValue.toLocaleString(DEFAULT_LOCALE)}</>
          )}
        </p>
      </div>
      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-2 min-h-[200px] p-2 rounded-lg border border-border/50 transition-colors",
              snapshot.isDraggingOver ? "bg-muted/60 border-gold/40" : "bg-muted/30",
            )}
          >
            {deals.map((deal, index) => (
              <KanbanDraggableCard
                key={deal.id}
                deal={deal}
                index={index}
                onStageChange={onStageChange}
                onDelete={onDelete}
                onOpen={onOpen}
              />
            ))}
            {provided.placeholder}
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="text-center py-8 text-xs text-muted-foreground">No deals</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
});
