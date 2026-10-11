"use client";

import { memo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { DEAL_STAGE_TONE } from "./deal-stage-tone";
import { KanbanColumnShell, KanbanEmptyDrop } from "@/components/shared/kanban";
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
          className="rounded-md outline-none focus-visible:focus-ring"
        >
          <DealKanbanCard
            deal={deal}
            isDragging={dragSnapshot.isDragging}
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
    <Droppable droppableId={stage.key}>
      {(provided, snapshot) => (
        <KanbanColumnShell
          title={stage.label}
          tone={DEAL_STAGE_TONE[stage.key] ?? "neutral"}
          count={deals.length}
          summary={stageValue > 0 ? <>₹{stageValue.toLocaleString(DEFAULT_LOCALE)}</> : undefined}
          isDraggingOver={snapshot.isDraggingOver}
          innerRef={provided.innerRef}
          droppableProps={provided.droppableProps}
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
          {deals.length === 0 && !snapshot.isDraggingOver && <KanbanEmptyDrop label="No deals" />}
        </KanbanColumnShell>
      )}
    </Droppable>
  );
});
