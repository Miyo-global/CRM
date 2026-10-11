"use client";

import { memo, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { kanbanCardClass } from "@/components/shared/kanban";
import { formatDistanceToNowStrict } from "date-fns";
import { Briefcase, MailIcon, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtsPipelineCandidate } from "@/types/hr";
import { formatDate, getInitials } from "./types";

interface CandidateCardProps {
  candidate: AtsPipelineCandidate;
  index: number;
  onClick: (candidate: AtsPipelineCandidate) => void;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  index,
  onClick,
}: CandidateCardProps) {
  const handleClick = useCallback(() => {
    onClick(candidate);
  }, [onClick, candidate]);

  return (
    <Draggable draggableId={String(candidate.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={cn(kanbanCardClass(snapshot.isDragging), "cursor-pointer select-none")}
        >
          <div className="flex items-start gap-2.5">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-brand-soft text-2xs font-semibold text-brand-soft-foreground">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight" title={candidate.name}>
                {candidate.name}
              </p>

              {candidate.jobTitle ? (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Briefcase className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{candidate.jobTitle}</span>
                </p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MailIcon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{candidate.email}</span>
                </p>
              )}
            </div>
          </div>

          {(candidate.source || candidate.rating !== null || candidate.appliedAt) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {candidate.source && (
                <Badge variant="secondary" className="max-w-32 truncate font-normal">
                  {candidate.source}
                </Badge>
              )}
              {candidate.rating !== null && (
                <Badge variant="warning" className="tabular-nums">
                  <Star className="size-3 fill-current" aria-hidden="true" />
                  {candidate.rating}
                </Badge>
              )}
              {candidate.appliedAt && (
                <span
                  className="ml-auto text-xs tabular-nums text-muted-foreground"
                  title={formatDate(candidate.appliedAt)}
                >
                  {formatDistanceToNowStrict(new Date(candidate.appliedAt))}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
});
