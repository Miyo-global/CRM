"use client";

import { useState, useCallback, memo } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { KanbanCanvas, KanbanColumnShell, KanbanEmptyDrop } from "@/components/shared/kanban";
import type {
  AtsPipelineStage,
  AtsPipelineCandidate,
  CandidateStatus,
} from "@/types/hr";
import {
  COLUMNS,
  CandidateCard,
  CandidateSheet,
  ColumnSkeleton,
  type ColumnConfig,
} from "@/features/hr/recruitment/kanban";
import {
  PipelineStageMoveDialog,
  type PipelineStageMoveRequest,
} from "@/features/hr/recruitment/pipeline-stage-move-dialog";
import { getCandidateEmailKindForGlobalStage } from "@/lib/hr/pipeline-stage-email";


interface KanbanColumnProps {
  col: ColumnConfig;
  items: AtsPipelineCandidate[];
  isRejected: boolean;
  onCardClick: (candidate: AtsPipelineCandidate) => void;
}

const KanbanColumn = memo(function KanbanColumn({
  col,
  items,
  isRejected,
  onCardClick,
}: KanbanColumnProps) {
  return (
    <Droppable droppableId={col.id}>
      {(provided, snapshot) => (
        <KanbanColumnShell
          title={col.label}
          tone={col.tone}
          count={items.length}
          isDraggingOver={snapshot.isDraggingOver}
          innerRef={provided.innerRef}
          droppableProps={provided.droppableProps}
          className={cn(isRejected && "opacity-80")}
        >
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
            {items.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                index={index}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}

            {items.length === 0 && !snapshot.isDraggingOver && <KanbanEmptyDrop />}
          </div>
        </KanbanColumnShell>
      )}
    </Droppable>
  );
});

interface PipelineKanbanProps {
  stages: AtsPipelineStage[];
  onStageChange: (candidateId: number, newStage: CandidateStatus, sendEmail?: boolean) => void;
  isLoading?: boolean;
  isPending?: boolean;
}

export function PipelineKanban({
  stages,
  onStageChange,
  isLoading,
  isPending = false,
}: PipelineKanbanProps) {
  const [selectedCandidate, setSelectedCandidate] =
    useState<AtsPipelineCandidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [pendingMove, setPendingMove] = useState<PipelineStageMoveRequest | null>(null);
  const [pendingStage, setPendingStage] = useState<CandidateStatus | null>(null);

  const stageMap = Object.fromEntries(
    stages.map((s) => [s.stage, s.candidates]),
  );

  const handleCardClick = useCallback((candidate: AtsPipelineCandidate) => {
    setSelectedCandidate(candidate);
    setSheetOpen(true);
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const candidateId = Number(result.draggableId);
      const newStage = result.destination.droppableId as CandidateStatus;
      if (result.source.droppableId === newStage) return;

      const candidate = stages
        .flatMap((s) => s.candidates)
        .find((c) => c.id === candidateId);
      const emailKind = getCandidateEmailKindForGlobalStage(newStage);
      const col = COLUMNS.find((c) => c.id === newStage);
      setPendingStage(newStage);
      setPendingMove({
        entityId: candidateId,
        entityName: candidate?.name ?? `Candidate #${candidateId}`,
        stageLabel: col?.label ?? newStage,
        emailKind,
      });
    },
    [onStageChange, stages],
  );

  const confirmMove = useCallback(
    (sendEmail: boolean) => {
      if (pendingMove && pendingStage) {
        onStageChange(pendingMove.entityId, pendingStage, sendEmail);
        setPendingMove(null);
        setPendingStage(null);
      }
    },
    [pendingMove, pendingStage, onStageChange],
  );

  const handleMoveDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setPendingMove(null);
      setPendingStage(null);
    }
  }, []);

  if (isLoading) {
    return (
      <KanbanCanvas aria-busy="true">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.id} col={col} />
        ))}
      </KanbanCanvas>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <KanbanCanvas>
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              items={stageMap[col.id] ?? []}
              isRejected={col.id === "REJECTED"}
              onCardClick={handleCardClick}
            />
          ))}
        </KanbanCanvas>
      </DragDropContext>

      <CandidateSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <PipelineStageMoveDialog
        open={!!pendingMove}
        onOpenChange={handleMoveDialogChange}
        move={pendingMove}
        isPending={isPending}
        onConfirm={confirmMove}
      />
    </>
  );
}
