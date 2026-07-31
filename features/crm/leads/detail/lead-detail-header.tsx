"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Flame,
  Clock,
  Edit2,
  ArrowRightCircle,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AIScoreButton } from "../ai-score-button";
import { AIEmailDialog } from "../ai-email-dialog";
import { AINextActionButton } from "../ai-next-action-button";
import { AIEnrichLeadButton } from "../ai-enrich-lead-button";
import {
  STATUS_PIPELINE,
  STATUS_STYLES,
  PRIORITY_STYLES,
  getScoreBadge,
  getSlaCountdown,
  type PipelineStatus,
} from "./lead-types";

interface LeadDetailHeaderProps {
  lead: {
    id?: number;
    name: string;
    company?: string | null;
    designation?: string | null;
    status: string;
    priority?: string | null;
    [key: string]: unknown;
  };
  isEditing: boolean;
  isStatusPending?: boolean;
  onToggleEdit: () => void;
  onStatusChange: (status: PipelineStatus) => void;
}

interface PipelineStepProps {
  status: PipelineStatus;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isLast: boolean;
  isPending: boolean;
  onStatusChange: (status: PipelineStatus) => void;
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};

function PipelineStep({
  status,
  isActive,
  isPast,
  isLast,
  isPending,
  onStatusChange,
}: PipelineStepProps) {
  const handleClick = useCallback(
    () => onStatusChange(status),
    [status, onStatusChange]
  );

  const isLost = status === "LOST";

  return (
    <div className="flex items-center flex-1 min-w-0">
      <button
        onClick={handleClick}
        disabled={isPending || isActive}
        className="flex flex-col items-center gap-1.5 group shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Move to ${STATUS_LABELS[status]}`}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            isActive
              ? cn(
                  "h-5 w-5 border-2 border-gold bg-gold/20",
                  isLost && "border-red-400 bg-red-500/20"
                )
              : isPast
                ? cn("h-3 w-3", isLost ? "bg-red-400" : "bg-gold")
                : "h-3 w-3 rounded-full border border-border bg-background group-hover:border-muted-foreground"
          )}
        >
          {isActive && (
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isLost ? "bg-red-400" : "bg-gold"
              )}
            />
          )}
        </div>
        <span
          className={cn(
            "text-[10px] font-medium whitespace-nowrap leading-none",
            isActive
              ? isLost
                ? "text-red-400"
                : "text-gold"
              : isPast
                ? "text-muted-foreground"
                : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </button>

      {!isLast && (
        <div
          className={cn(
            "flex-1 h-px mx-2 mb-3.5",
            isPast ? "bg-gold/50" : "bg-border/50"
          )}
        />
      )}
    </div>
  );
}

export function LeadDetailHeader({
  lead,
  isEditing,
  isStatusPending = false,
  onToggleEdit,
  onStatusChange,
}: LeadDetailHeaderProps) {
  const router = useRouter();

  const handleBack = useCallback(() => router.push("/crm/leads"), [router]);
  const handleConvert = useCallback(
    () => onStatusChange("CONVERTED"),
    [onStatusChange]
  );

  const currentStatusIndex = STATUS_PIPELINE.indexOf(
    lead.status as PipelineStatus
  );
  const scoreBadge = getScoreBadge(
    (lead as Record<string, unknown>).score as number | null
  );
  const sla = getSlaCountdown(
    (lead as Record<string, unknown>).slaDeadline as string | null
  );
  const priorityStyle =
    PRIORITY_STYLES[lead.priority ?? "WARM"] ?? PRIORITY_STYLES.WARM;

  const initials = lead.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Card className="shadow-noir border-t-2 border-t-gold overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4 pb-3">
          <div className="shrink-0 h-12 w-12 rounded-full ring-2 ring-gold/50 bg-gold/10 flex items-center justify-center text-gold font-bold text-lg select-none">
            {initials || "?"}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold truncate leading-tight">
                {lead.name}
              </h2>
              {typeof lead.id === "number" && (
                <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                  LD-{String(lead.id).padStart(5, "0")}
                </span>
              )}
            </div>
            {(lead.company || lead.designation) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                {lead.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    {lead.company}
                  </span>
                )}
                {lead.company && lead.designation && (
                  <span className="text-muted-foreground/40">·</span>
                )}
                {lead.designation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {lead.designation}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 font-semibold",
                  priorityStyle.bg,
                  priorityStyle.color
                )}
              >
                {priorityStyle.label}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 font-semibold",
                  STATUS_STYLES[lead.status]?.bg,
                  STATUS_STYLES[lead.status]?.color
                )}
              >
                {lead.status}
              </Badge>

              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-0.5 font-semibold", scoreBadge.bg, scoreBadge.color)}
              >
                <Flame className="h-3 w-3 mr-1" />
                {String(
                  (lead as Record<string, unknown>).score ?? 0
                )}{" "}
                · {scoreBadge.label}
              </Badge>

              {sla && (
                <Badge variant="outline" className={cn("text-xs px-2 py-0.5 font-semibold", sla.color)}>
                  <Clock className="h-3 w-3 mr-1" />
                  {sla.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap justify-end">
              <AIScoreButton
                leadId={(lead as Record<string, unknown>).id as number}
                currentScore={
                  (lead as Record<string, unknown>).score as number | null
                }
                compact
              />
              <AIEmailDialog
                leadName={lead.name}
                company={lead.company}
                designation={lead.designation}
                potentialValue={
                  (lead as Record<string, unknown>).potentialValue as
                    | string
                    | undefined
                }
              />
              <AINextActionButton
                leadId={(lead as Record<string, unknown>).id as number}
                compact
              />
              <AIEnrichLeadButton
                leadName={lead.name}
                company={lead.company}
                email={
                  (lead as Record<string, unknown>).email as
                    | string
                    | null
                    | undefined
                }
                designation={lead.designation}
                city={
                  (lead as Record<string, unknown>).city as
                    | string
                    | null
                    | undefined
                }
              />

              <Button variant="outline" size="sm" onClick={onToggleEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>

              {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConvert}
                  disabled={isStatusPending}
                >
                  <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                  {isStatusPending ? "Updating..." : "Convert"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1">
          <div className="flex items-start px-2 py-2.5 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
            {STATUS_PIPELINE.map((status, i) => (
              <PipelineStep
                key={status}
                status={status}
                index={i}
                isActive={status === lead.status}
                isPast={i < currentStatusIndex}
                isLast={i === STATUS_PIPELINE.length - 1}
                isPending={isStatusPending}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
