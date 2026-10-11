"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
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
import type { Tone } from "@/lib/design/tones";
import { StatusPill } from "@/components/ui/status-pill";
import { DetailHeader } from "@/components/shared/detail-header";
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

const STATUS_TONE: Record<string, Tone> = {
  NEW: "info",
  CONTACTED: "teal",
  INTERESTED: "plum",
  QUALIFIED: "brand",
  CONVERTED: "success",
  LOST: "danger",
};

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
    <li className="flex min-w-24 flex-1 items-start" aria-current={isActive ? "step" : undefined}>
      <button
        onClick={handleClick}
        disabled={isPending || isActive}
        className="group flex shrink-0 flex-col items-center gap-1.5 rounded-md px-1 outline-none focus-visible:focus-ring disabled:cursor-not-allowed"
        title={`Move to ${STATUS_LABELS[status]}`}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-colors",
            isActive
              ? isLost
                ? "bg-card ring-2 ring-danger-500"
                : "bg-card ring-2 ring-primary"
              : isPast
                ? "bg-primary text-primary-foreground"
                : "bg-muted ring-1 ring-border group-hover:ring-border-strong"
          )}
        >
          {isActive ? (
            <span className={cn("size-2.5 rounded-full", isLost ? "bg-danger-500" : "bg-primary")} />
          ) : isPast ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : null}
        </span>
        <span
          className={cn(
            "whitespace-nowrap text-xs font-medium leading-none",
            isActive
              ? isLost
                ? "text-danger-strong"
                : "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </button>

      {!isLast && (
        <span
          aria-hidden="true"
          className={cn("mx-1 mt-3 h-px flex-1", isPast ? "bg-primary" : "bg-border")}
        />
      )}
    </li>
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

  const status = STATUS_STYLES[lead.status];
  const statusTone = STATUS_TONE[lead.status] ?? "neutral";

  return (
    <div className="space-y-4">
      <DetailHeader
        back={
          <Button variant="ghost" size="sm" className="-ml-2" onClick={handleBack}>
            <ArrowLeft />
            Back to Pipeline
          </Button>
        }
        avatar={
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 select-none items-center justify-center rounded-full bg-brand-soft font-display text-xl font-bold text-brand-soft-foreground ring-2 ring-primary/40"
          >
            {initials || "?"}
          </div>
        }
        title={lead.name}
        status={
          <>
            <StatusPill tone={statusTone} dot>
              {status ? STATUS_LABELS[lead.status as PipelineStatus] ?? lead.status : lead.status}
            </StatusPill>
            {typeof lead.id === "number" && (
              <span className="font-mono text-xs tabular-nums text-subtle-foreground">
                LD-{String(lead.id).padStart(5, "0")}
              </span>
            )}
          </>
        }
        subtitle={
          lead.company || lead.designation ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                  {lead.company}
                </span>
              )}
              {lead.company && lead.designation && <span className="text-subtle-foreground">·</span>}
              {lead.designation && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {lead.designation}
                </span>
              )}
            </span>
          ) : undefined
        }
        meta={
          <>
            <Badge className={cn(priorityStyle.bg, priorityStyle.color)}>{priorityStyle.label}</Badge>
            <Badge className={cn("tabular-nums", scoreBadge.bg, scoreBadge.color)}>
              <Flame className="size-3" aria-hidden="true" />
              {String((lead as Record<string, unknown>).score ?? 0)} · {scoreBadge.label}
            </Badge>
            {sla && (
              <Badge className={cn("tabular-nums", sla.color)}>
                <Clock className="size-3" aria-hidden="true" />
                {sla.label}
              </Badge>
            )}
          </>
        }
        actions={
          <>
            <AIScoreButton
              leadId={(lead as Record<string, unknown>).id as number}
              currentScore={(lead as Record<string, unknown>).score as number | null}
              compact
            />
            <AIEmailDialog
              leadName={lead.name}
              company={lead.company}
              designation={lead.designation}
              potentialValue={(lead as Record<string, unknown>).potentialValue as string | undefined}
            />
            <AINextActionButton leadId={(lead as Record<string, unknown>).id as number} compact />
            <AIEnrichLeadButton
              leadName={lead.name}
              company={lead.company}
              email={(lead as Record<string, unknown>).email as string | null | undefined}
              designation={lead.designation}
              city={(lead as Record<string, unknown>).city as string | null | undefined}
            />
            <Button variant="outline" size="sm" onClick={onToggleEdit}>
              <Edit2 />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
              <Button size="sm" onClick={handleConvert} loading={isStatusPending}>
                {!isStatusPending && <ArrowRightCircle />}
                {isStatusPending ? "Updating..." : "Convert"}
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="p-4">
          <ol aria-label="Lead pipeline" className="flex items-start overflow-x-auto pb-1">
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
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
