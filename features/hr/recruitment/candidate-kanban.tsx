"use client";

import { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Star, Briefcase, MailIcon } from "lucide-react";
import type { AtsPipelineStage, CandidateStatus } from "@/types/hr";

const COLUMNS: { id: CandidateStatus; label: string; color: string }[] = [
  { id: "NEW",       label: "New",        color: "bg-blue-500" },
  { id: "SCREENING", label: "Screening",  color: "bg-yellow-500" },
  { id: "INTERVIEW", label: "Interview",  color: "bg-purple-500" },
  { id: "OFFER",     label: "Offer",      color: "bg-orange-500" },
  { id: "HIRED",     label: "Hired",      color: "bg-green-500" },
];

const REJECTED_COLUMN: { id: CandidateStatus; label: string; color: string } = {
  id: "REJECTED",
  label: "Rejected",
  color: "bg-red-500",
};

interface CandidateKanbanProps {
  stages: AtsPipelineStage[];
  onStageChange: (candidateId: number, newStage: CandidateStatus) => void;
}

export function CandidateKanban({ stages, onStageChange }: CandidateKanbanProps) {
  const stageMap = Object.fromEntries(stages.map((s) => [s.stage, s.candidates]));

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const candidateId = Number(result.draggableId);
      const newStage = result.destination.droppableId as CandidateStatus;
      if (result.source.droppableId !== newStage) {
        onStageChange(candidateId, newStage);
      }
    },
    [onStageChange]
  );

  const allCols = [...COLUMNS, REJECTED_COLUMN];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {allCols.map((col) => {
          const items = stageMap[col.id] ?? [];
          const isRejected = col.id === "REJECTED";
          return (
            <div
              key={col.id}
              className={`flex flex-col min-w-[240px] w-[240px] shrink-0 ${
                isRejected ? "opacity-75" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                <span className="text-xs font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {items.length}
                </Badge>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] rounded-lg border border-dashed p-1.5 space-y-1.5 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <ScrollArea className="h-[calc(100vh-340px)]">
                      <div className="space-y-1.5 pr-1">
                        {items.map((candidate, index) => (
                          <Draggable
                            key={candidate.id}
                            draggableId={String(candidate.id)}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <Link href={`/hr/recruitment/candidates/${candidate.id}`}>
                                  <Card
                                    className={`p-2.5 cursor-pointer hover:shadow-sm transition-shadow ${
                                      dragSnapshot.isDragging
                                        ? "shadow-md ring-2 ring-primary/20"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                          {candidate.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>

                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium truncate">
                                          {candidate.name}
                                        </p>

                                        {candidate.jobTitle && (
                                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                            <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                            {candidate.jobTitle}
                                          </p>
                                        )}

                                        {!candidate.jobTitle && (
                                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                            <MailIcon className="h-2.5 w-2.5 shrink-0" />
                                            {candidate.email}
                                          </p>
                                        )}

                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          {candidate.source && (
                                            <Badge
                                              variant="outline"
                                              className="text-[8px] px-1 py-0 h-4"
                                            >
                                              {candidate.source}
                                            </Badge>
                                          )}
                                          {candidate.rating !== null && (
                                            <div className="flex items-center gap-0.5">
                                              <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                              <span className="text-[10px] font-medium">
                                                {candidate.rating}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    </ScrollArea>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
