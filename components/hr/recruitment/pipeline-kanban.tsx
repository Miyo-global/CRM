"use client";

import { useState, useCallback, memo } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] shrink-0",
        isRejected && "opacity-80",
      )}
    >
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span className="text-xs font-semibold tracking-wide">{col.label}</span>
        <span
          className={cn(
            "ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold min-w-[22px]",
            col.badge,
          )}
        >
          {items.length}
        </span>
      </div>

      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-xl border-2 p-2 transition-colors",
              col.bg,
              col.border,
              snapshot.isDraggingOver && "ring-2 ring-primary/30",
            )}
          >
            <div
              className="overflow-y-auto space-y-2"
              style={{ maxHeight: "calc(100vh - 250px)" }}
            >
              {items.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={index}
                  onClick={onCardClick}
                />
              ))}
              {provided.placeholder}

              {items.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border/50">
                  <p className="text-[10px] text-muted-foreground">Drop here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.id} col={col} />
        ))}
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              items={stageMap[col.id] ?? []}
              isRejected={col.id === "REJECTED"}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
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
