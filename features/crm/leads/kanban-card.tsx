"use client";

import { useCallback, useState } from "react";
import { Plus, ArrowRight, X, GripVertical, Building2, Clock, AlertTriangle, Info } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kanbanCardClass } from "@/components/shared/kanban";
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
            "inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-full border font-medium",
            overdue
              ? "bg-danger-soft text-danger-strong border-danger-strong/30"
              : urgent
              ? "bg-warning-soft text-warning-strong border-warning-strong/30"
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
    ? "text-success-strong border-success-strong/30 bg-success-soft"
    : score >= 60
    ? "text-warning-strong border-warning-strong/30 bg-warning-soft"
    : score >= 40
    ? "text-warning-strong border-warning-strong/30 bg-warning-soft"
    : "text-danger-strong border-danger-strong/30 bg-danger-soft";

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={(open) => { if (open) setEnabled(true); }}>
        <TooltipTrigger asChild>
          <span
            className={cn("inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded-full border font-semibold cursor-help", color)}
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
              <p className="text-2xs text-muted-foreground">No scoring rules matched this lead.</p>
            ) : (
              <div className="space-y-1">
                {data.firedRules.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-2xs">
                    <span className="truncate">{r.name}</span>
                    <span className="font-semibold text-success-strong shrink-0">+{r.points}</span>
                  </div>
                ))}
                <p className="text-2xs text-muted-foreground pt-0.5 border-t border-border">
                  {data.firedRules.length} of {data.totalRules} rules matched
                </p>
              </div>
            )
          ) : (
            <p className="text-2xs text-muted-foreground">Loading...</p>
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

  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className="group"
        >
          <div
            className={cn(kanbanCardClass(dragSnapshot.isDragging), "cursor-pointer")}
            onClick={handleOpen}
          >
              <div className="flex items-start gap-2">

                <div
                  {...dragProvided.dragHandleProps}
                  className="-ml-1 mt-0.5 shrink-0 rounded-sm text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:focus-ring cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium" title={lead.name}>{lead.name}</p>
                      <p className="mt-0.5 font-mono text-2xs leading-none text-subtle-foreground tabular-nums">
                        LD-{String(lead.id).padStart(5, "0")}
                      </p>
                    </div>
                    {lead.assignedTo ? (
                      <Avatar className="size-5 shrink-0" title={lead.assignedTo.name ?? undefined}>
                        <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                        <AvatarFallback className="text-3xs">
                          {getInitials(lead.assignedTo.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <button
                        onClick={handleSelfAssign}
                        disabled={selfAssign.isPending}
                        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-primary hover:text-brand-text focus-visible:focus-ring disabled:opacity-50"
                        aria-label="Self-assign this lead"
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                  </div>

                  {(lead.company || (lead.potentialValue && Number(lead.potentialValue) > 0)) && (
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      {lead.company && (
                        <span className="flex min-w-0 items-center gap-1 truncate" title={lead.company}>
                          <Building2 className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{lead.company}</span>
                        </span>
                      )}
                      {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                        <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
                          {formatINRCompact(lead.potentialValue)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {lead.priority && (
                      <Badge className={cn("h-5 px-1.5 text-2xs", PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.WARM)}>
                        {lead.priority}
                      </Badge>
                    )}
                    {lead.source && (
                      <Badge className={cn("h-5 px-1.5 text-2xs font-normal capitalize", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}>
                        {lead.source.replace("_", " ")}
                      </Badge>
                    )}
                    {lead.slaDeadline && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <SlaCountdown deadline={lead.slaDeadline} />
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xs tabular-nums text-muted-foreground">
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
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {status !== "CONVERTED" && status !== "LOST" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={handleMarkLost}
                            className="text-danger-strong hover:bg-danger-soft"
                            aria-label="Mark as lost"
                          >
                            <X className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={handleMoveNext}
                            className="text-brand-text hover:bg-brand-soft"
                            aria-label="Move to next stage"
                          >
                            <ArrowRight className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
