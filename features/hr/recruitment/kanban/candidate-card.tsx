"use client";

import { memo, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Briefcase, MailIcon, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtsPipelineCandidate } from "@/types/hr";
import { getInitials } from "./types";

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
        >
          <Card
            onClick={handleClick}
            className={cn(
              "p-2.5 cursor-pointer select-none transition-shadow hover:shadow-md",
              snapshot.isDragging && "shadow-lg ring-2 ring-primary/25 rotate-[0.5deg]"
            )}
          >
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate leading-tight">{candidate.name}</p>

                {candidate.jobTitle ? (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-2.5 w-2.5 shrink-0" />
                    {candidate.jobTitle}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MailIcon className="h-2.5 w-2.5 shrink-0" />
                    {candidate.email}
                  </p>
                )}

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {candidate.source && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-normal"
                    >
                      {candidate.source}
                    </Badge>
                  )}
                  {candidate.rating !== null && (
                    <div className="flex items-center gap-0.5 ml-auto">
                      <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-medium text-amber-600">
                        {candidate.rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
});
