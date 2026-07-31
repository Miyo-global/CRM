"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { JobPipelineCandidate, JobPipelineStage } from "@/types/hr";
import {
  PipelineStageMoveDialog,
  type PipelineStageMoveRequest,
} from "@/features/hr/recruitment/pipeline-stage-move-dialog";
import { getCandidateEmailKindForJobStage } from "@/lib/hr/pipeline-stage-email";

const STAGE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  APPLIED:    { bg: "bg-slate-100 dark:bg-slate-800/40",  border: "border-slate-300 dark:border-slate-600",  badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  SHORTLISTED:{ bg: "bg-blue-50 dark:bg-blue-950/30",     border: "border-blue-300 dark:border-blue-700",    badge: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200" },
  OFFER:      { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-300 dark:border-purple-700",badge: "bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200" },
  HIRED:      { bg: "bg-green-50 dark:bg-green-950/30",   border: "border-green-300 dark:border-green-700",  badge: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200" },
  REJECTED:   { bg: "bg-red-50 dark:bg-red-950/30",       border: "border-red-300 dark:border-red-700",      badge: "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200" },
};

const ROUND_COLORS = [
  { bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-300 dark:border-amber-700",    badge: "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-700",  badge: "bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-200" },
  { bg: "bg-teal-50 dark:bg-teal-950/30",     border: "border-teal-300 dark:border-teal-700",      badge: "bg-teal-200 text-teal-700 dark:bg-teal-800 dark:text-teal-200" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-300 dark:border-indigo-700",  badge: "bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200" },
  { bg: "bg-pink-50 dark:bg-pink-950/30",     border: "border-pink-300 dark:border-pink-700",      badge: "bg-pink-200 text-pink-700 dark:bg-pink-800 dark:text-pink-200" },
];

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
            "bg-background rounded-lg border px-3 py-2.5 shadow-sm cursor-grab select-none transition-shadow",
            snapshot.isDragging && "shadow-md rotate-1",
          )}
        >
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0">
              {getInitials(candidate.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{candidate.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{candidate.email}</p>
            </div>
            {candidate.rating !== null && (
              <span className="text-[10px] text-amber-500 font-semibold shrink-0">★ {candidate.rating}</span>
            )}
          </div>
          {candidate.source && (
            <p className="text-[10px] text-muted-foreground mt-1.5 pl-9">{candidate.source}</p>
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
                <span className={cn("ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold min-w-[22px]", colors.badge)}>
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
