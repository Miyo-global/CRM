"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { TAG_TONE_CYCLE, type Tone } from "@/lib/design/tones";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KanbanCanvas, KanbanColumnShell, KanbanEmptyDrop, kanbanCardClass } from "@/components/shared/kanban";
import type { JobPipelineCandidate, JobPipelineStage } from "@/types/hr";
import {
  PipelineStageMoveDialog,
  type PipelineStageMoveRequest,
} from "@/features/hr/recruitment/pipeline-stage-move-dialog";
import { getCandidateEmailKindForJobStage } from "@/lib/hr/pipeline-stage-email";

const STAGE_TONES: Record<string, Tone> = {
  APPLIED: "info",
  SHORTLISTED: "teal",
  OFFER: "brand",
  HIRED: "success",
  REJECTED: "danger",
};

// Interview rounds are categorical → tag cycle.
function getStageTone(stageId: string, roundIndex: number): Tone {
  return STAGE_TONES[stageId] ?? TAG_TONE_CYCLE[roundIndex % TAG_TONE_CYCLE.length];
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface CandidateCardProps {
  candidate: JobPipelineCandidate;
  index: number;
}

function CandidateCard({ candidate, index }: CandidateCardProps) {
  return (
    <Draggable draggableId={String(candidate.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(kanbanCardClass(snapshot.isDragging), "cursor-grab select-none")}
        >
          <div className="flex items-start gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xs font-semibold text-brand-soft-foreground">
              {getInitials(candidate.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={candidate.name}>{candidate.name}</p>
              <p className="truncate text-xs text-muted-foreground">{candidate.email}</p>
            </div>
          </div>
          {(candidate.source || candidate.rating !== null) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {candidate.source && (
                <Badge variant="secondary" className="max-w-32 truncate font-normal">{candidate.source}</Badge>
              )}
              {candidate.rating !== null && (
                <Badge variant="warning" className="tabular-nums">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  {candidate.rating}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

interface JobPipelineKanbanProps {
  stages: JobPipelineStage[];
  onStageChange: (applicationId: number, newStage: string, sendEmail?: boolean) => void;
  onRoundEntry?: (candidate: JobPipelineCandidate, stage: string) => void;
  isPending?: boolean;
}

export function JobPipelineKanban({
  stages,
  onStageChange,
  onRoundEntry,
  isPending = false,
}: JobPipelineKanbanProps) {
  const [pendingMove, setPendingMove] = useState<PipelineStageMoveRequest | null>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<JobPipelineCandidate | null>(null);

  const completeMove = useCallback(
    (applicationId: number, newStage: string, sendEmail: boolean, candidate: JobPipelineCandidate | null) => {
      onStageChange(applicationId, newStage, sendEmail);
      if (newStage.startsWith("ROUND_") && onRoundEntry && candidate) {
        onRoundEntry(candidate, newStage);
      }
    },
    [onStageChange, onRoundEntry],
  );
  const roundIndices: Record<string, number> = {};
  let roundCount = 0;
  for (const s of stages) {
    if (s.stage.startsWith("ROUND_")) {
      roundIndices[s.stage] = roundCount++;
    }
  }

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const { draggableId, destination, source } = result;
      if (destination.droppableId === source.droppableId) return;
      const newStage = destination.droppableId;
      const applicationId = Number(draggableId);
      const candidate = stages.flatMap((s) => s.candidates).find((c) => c.id === applicationId) ?? null;
      const emailKind = getCandidateEmailKindForJobStage(newStage);
      const stageMeta = stages.find((s) => s.stage === newStage);
      setPendingStage(newStage);
      setPendingCandidate(candidate);
      setPendingMove({
        entityId: applicationId,
        entityName: candidate?.name ?? `Application #${applicationId}`,
        stageLabel: stageMeta?.label ?? newStage,
        emailKind,
      });
    },
    [completeMove, stages],
  );

  const confirmMove = useCallback(
    (sendEmail: boolean) => {
      if (pendingMove && pendingStage) {
        completeMove(pendingMove.entityId, pendingStage, sendEmail, pendingCandidate);
        setPendingMove(null);
        setPendingStage(null);
        setPendingCandidate(null);
      }
    },
    [pendingMove, pendingStage, pendingCandidate, completeMove],
  );

  const handleMoveDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setPendingMove(null);
      setPendingStage(null);
      setPendingCandidate(null);
    }
  }, []);

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
      <KanbanCanvas className="min-h-[60vh]">
        {stages.map((stage) => {
          const tone = getStageTone(stage.stage, roundIndices[stage.stage] ?? 0);
          const isRejected = stage.stage === "REJECTED";
          return (
            <Droppable key={stage.stage} droppableId={stage.stage}>
              {(provided, snapshot) => (
                <KanbanColumnShell
                  title={stage.label}
                  tone={tone}
                  count={stage.candidates.length}
                  isDraggingOver={snapshot.isDraggingOver}
                  innerRef={provided.innerRef}
                  droppableProps={provided.droppableProps}
                  className={cn(isRejected && "opacity-80")}
                >
                  {stage.candidates.map((c, i) => (
                    <CandidateCard key={c.id} candidate={c} index={i} />
                  ))}
                  {provided.placeholder}
                  {stage.candidates.length === 0 && !snapshot.isDraggingOver && <KanbanEmptyDrop />}
                </KanbanColumnShell>
              )}
            </Droppable>
          );
        })}
      </KanbanCanvas>
      </DragDropContext>

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
