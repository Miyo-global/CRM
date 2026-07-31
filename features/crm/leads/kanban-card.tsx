"use client";

import { useCallback, useState } from "react";
import { Plus, ArrowRight, X, GripVertical, Building2, Clock, AlertTriangle, Info } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatINRCompact } from "@/lib/format-utils";
import { toast } from "sonner";
import { useSelfAssignLead } from "@/lib/hooks/trpc-hooks";
import { useLeadScoreExplanation } from "@/lib/api/hooks/leads";
import { STATUSES, SOURCE_COLORS, PRIORITY_CONFIG, timeAgo, getInitials } from "./leads-constants";
import type { BoardLead, LeadStatus } from "./leads-types";
import { AIScoreButton } from "./ai-score-button";
import { differenceInHours, differenceInMinutes, isPast, format } from "date-fns";

interface KanbanCardProps {
  lead: BoardLead;
  index: number;
  status: LeadStatus;
  onOpen: (id: number) => void;
  onMoveStatus: (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => void;
}

const PRIORITY_BORDER: Record<string, string> = {
  HOT: "border-l-red-500",
  WARM: "border-l-amber-500",
  COLD: "border-l-blue-400",
};

function SlaCountdown({ deadline }: { deadline: string | Date }) {
  const d = new Date(deadline);
  const overdue = isPast(d);
  const hoursLeft = differenceInHours(d, new Date());
  const minutesLeft = differenceInMinutes(d, new Date());
  const urgent = !overdue && hoursLeft < 4;

  const label = overdue
    ? `Overdue ${Math.abs(hoursLeft)}h`
    : hoursLeft < 1
    ? `${minutesLeft}m left`
    : `${hoursLeft}h left`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
            overdue
              ? "bg-red-500/10 text-red-500 border-red-500/30"
              : urgent
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
              : "bg-muted text-muted-foreground border-border",
          )}>
            {overdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          SLA deadline: {format(d, "dd MMM yyyy, HH:mm")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreExplainerBadge({ leadId, score }: { leadId: number; score: number }) {
  const [enabled, setEnabled] = useState(false);
  const { data } = useLeadScoreExplanation(leadId, enabled);

  const color = score >= 80
    ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
    : score >= 60
    ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
    : score >= 40
    ? "text-orange-500 border-orange-500/30 bg-orange-500/10"
    : "text-red-400 border-red-400/30 bg-red-400/10";

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={(open) => { if (open) setEnabled(true); }}>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold cursor-help", color)}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="h-2.5 w-2.5 opacity-60" />
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-semibold">Score: {score}/100</p>
          {data ? (
            data.firedRules.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No scoring rules matched this lead.</p>
            ) : (
              <div className="space-y-1">
                {data.firedRules.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate">{r.name}</span>
                    <span className="font-semibold text-emerald-500 shrink-0">+{r.points}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-0.5 border-t border-border">
                  {data.firedRules.length} of {data.totalRules} rules matched
                </p>
              </div>
            )
          ) : (
            <p className="text-[11px] text-muted-foreground">Loading...</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function KanbanCard({ lead, index, status, onOpen, onMoveStatus }: KanbanCardProps) {
  const selfAssign = useSelfAssignLead();

  const handleOpen = useCallback(() => onOpen(lead.id), [lead.id, onOpen]);
  const handleSelfAssign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selfAssign.mutate(lead.id, { onSuccess: () => toast.success("Lead assigned to you") });
  }, [lead.id, selfAssign]);
  const handleMarkLost = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveStatus(lead.id, "LOST", status);
  }, [lead.id, status, onMoveStatus]);
  const handleMoveNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = STATUSES.indexOf(status) + 1;
    if (nextIdx < STATUSES.length - 1) onMoveStatus(lead.id, STATUSES[nextIdx], status);
  }, [lead.id, status, onMoveStatus]);

  const priorityBorder = lead.priority
    ? PRIORITY_BORDER[lead.priority] ?? ""
    : "";

  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className="group"
        >
          <Card
            className={cn(
              "cursor-pointer transition-all border-l-[3px]",
              priorityBorder || "border-l-transparent",
              dragSnapshot.isDragging
                ? "shadow-xl ring-2 ring-gold/30 rotate-[2deg] scale-105"
                : "hover:shadow-md hover:border-gold/30",
            )}
            onClick={handleOpen}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">

                <div
                  {...dragProvided.dragHandleProps}
                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/50 leading-none mt-0.5">
                        LD-{String(lead.id).padStart(5, "0")}
                      </p>
                    </div>
                    {lead.assignedTo ? (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(lead.assignedTo.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <button
                        onClick={handleSelfAssign}
                        className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-gold/50 transition-colors"
                        aria-label="Self-assign this lead"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {lead.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {lead.company}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.priority && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold",
                        PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.WARM,
                      )}>
                        {lead.priority}
                      </span>
                    )}
                    {lead.source && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        SOURCE_COLORS[lead.source] || SOURCE_COLORS.other,
                      )}>
                        {lead.source.replace("_", " ")}
                      </span>
                    )}
                    {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                      <span className="text-[10px] text-gold font-semibold">
                        {formatINRCompact(lead.potentialValue)}
                      </span>
                    )}
                    {lead.slaDeadline && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <SlaCountdown deadline={lead.slaDeadline} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {lead.createdAt ? timeAgo(lead.createdAt) : ""}
                      </span>
                      {lead.score != null && lead.score > 0 ? (
                        <ScoreExplainerBadge leadId={lead.id} score={lead.score} />
                      ) : (
                        <div onClick={(e) => e.stopPropagation()}>
                          <AIScoreButton leadId={lead.id} currentScore={lead.score} compact />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status !== "CONVERTED" && status !== "LOST" && (
                        <>
                          <button
                            onClick={handleMarkLost}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            aria-label="Mark as lost"
                          >
                            <X className="h-3 w-3 text-red-400" />
                          </button>
                          <button
                            onClick={handleMoveNext}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-gold/20 transition-colors"
                            aria-label="Move to next stage"
                          >
                            <ArrowRight className="h-3 w-3 text-gold" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
