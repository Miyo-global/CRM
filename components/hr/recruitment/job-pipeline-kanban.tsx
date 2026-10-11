"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { TAG_TONE_CYCLE, toneSoft, type Tone } from "@/lib/design/tones";
import type { JobPipelineCandidate, JobPipelineStage } from "@/types/hr";
import {
  PipelineStageMoveDialog,
  type PipelineStageMoveRequest,
} from "@/features/hr/recruitment/pipeline-stage-move-dialog";
import { getCandidateEmailKindForJobStage } from "@/lib/hr/pipeline-stage-email";

// Columns stay neutral (§8.4); the stage tone lives on the count pill.
const stageTone = (t: Tone) => ({ bg: "bg-muted/60", border: "border-transparent", badge: toneSoft[t] });

const STAGE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  APPLIED: stageTone("info"),
  SHORTLISTED: stageTone("teal"),
  OFFER: stageTone("brand"),
  HIRED: stageTone("success"),
  REJECTED: stageTone("danger"),
};

// Interview rounds are categorical → tag cycle.
const ROUND_COLORS = TAG_TONE_CYCLE.map(stageTone);

function getStageColor(stageId: string, roundIndex: number) {
  if (STAGE_COLORS[stageId]) return STAGE_COLORS[stageId];
  return ROUND_COLORS[roundIndex % ROUND_COLORS.length];
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
          className={cn(
            "bg-card rounded-lg border px-3 py-2.5 shadow-xs cursor-grab select-none transition-shadow",
            snapshot.isDragging && "shadow-md rotate-1",
          )}
        >
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-brand-soft text-brand-soft-foreground text-2xs font-semibold flex items-center justify-center shrink-0">
              {getInitials(candidate.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{candidate.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{candidate.email}</p>
            </div>
            {candidate.rating !== null && (
              <span className="text-2xs text-warning-strong font-semibold shrink-0">★ {candidate.rating}</span>
            )}
          </div>
          {candidate.source && (
            <p className="text-2xs text-muted-foreground mt-1.5 pl-9">{candidate.source}</p>
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
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {stages.map((stage) => {
          const colors = getStageColor(stage.stage, roundIndices[stage.stage] ?? 0);
          const isRejected = stage.stage === "REJECTED";
          return (
            <div
              key={stage.stage}
              className={cn("flex flex-col min-w-[260px] w-[260px] shrink-0", isRejected && "opacity-80")}
            >
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <span className="text-xs font-semibold tracking-wide truncate">{stage.label}</span>
                <span className={cn("ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-2xs font-semibold min-w-[22px]", colors.badge)}>
                  {stage.candidates.length}
                </span>
              </div>
              <Droppable droppableId={stage.stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 rounded-xl border-2 p-2 space-y-2 transition-colors min-h-[120px]",
                      colors.bg,
                      snapshot.isDraggingOver ? "border-primary/50" : colors.border,
                    )}
                  >
                    {stage.candidates.map((c, i) => (
                      <CandidateCard key={c.id} candidate={c} index={i} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
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
