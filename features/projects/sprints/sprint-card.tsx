"use client";

import { useCallback } from "react";
import { format, differenceInDays, startOfDay } from "date-fns";
import {
  ArrowRightLeft, CalendarDays, Gauge, ListChecks, MoreHorizontal, Pencil, Play, Square, Target, Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/lib/design/tones";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EditSprintDialog } from "@/components/projects/edit-sprint-dialog";

export interface SprintData {
  id: number;
  name: string;
  status: string | null;
  startDate: Date | string;
  endDate: Date | string;
  goal?: string | null;
  tickets?: Array<{
    id: number;
    title?: string;
    status: string | null;
    points: number | null;
  }>;
}

interface SprintCardProps {
  sprint: SprintData;
  projectId: number;
  onStart?: (id: number) => void;
  onComplete?: (id: number) => void;
  onPlan?: (id: number) => void;
  isUpdating?: boolean;
}

const STATUS_INFO: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "info" },
  PLANNED: { label: "Planned", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "success" },
};

function SprintFact({ icon: Icon, label, children, className }: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-md bg-surface-sunken px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className={cn("mt-0.5 text-sm font-medium tabular-nums", className)}>{children}</p>
    </div>
  );
}

export function SprintCard({ sprint, projectId, onStart, onComplete, onPlan, isUpdating }: SprintCardProps) {
  const tickets = sprint.tickets || [];
  const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
  const completedPoints = tickets.filter((t) => t.status === "DONE").reduce((sum, t) => sum + (t.points || 0), 0);
  const progress = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  const endDate = new Date(sprint.endDate);
  const startDate = new Date(sprint.startDate);
  const daysRemaining = differenceInDays(startOfDay(endDate), startOfDay(new Date()));
  const totalDays = differenceInDays(startOfDay(endDate), startOfDay(startDate));

  const statusInfo = STATUS_INFO[sprint.status || "PLANNED"] ?? { label: sprint.status || "PLANNED", tone: "neutral" as const };

  const handleStart = useCallback(() => onStart?.(sprint.id), [sprint.id, onStart]);
  const handleComplete = useCallback(() => onComplete?.(sprint.id), [sprint.id, onComplete]);
  const handlePlan = useCallback(() => onPlan?.(sprint.id), [sprint.id, onPlan]);
  const doneTickets = tickets.filter((t) => t.status === "DONE").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Link
                href={`/projects/${projectId}?sprint=${sprint.id}`}
                className="truncate rounded-sm transition-colors hover:text-brand-text focus-visible:focus-ring"
              >
                {sprint.name}
              </Link>
              <StatusPill tone={statusInfo.tone} dot>{statusInfo.label}</StatusPill>
            </CardTitle>
            {sprint.goal && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{sprint.goal}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Sprint actions for ${sprint.name}`}>
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <EditSprintDialog
                  sprint={sprint}
                  projectId={projectId}
                  trigger={
                    <button className="flex w-full items-center px-2 py-1.5 text-sm">
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Edit Sprint
                    </button>
                  }
                />
              </DropdownMenuItem>
              {onPlan && (
                <DropdownMenuItem onClick={handlePlan}>
                  <ArrowRightLeft className="mr-2 size-4" aria-hidden="true" />
                  Plan Sprint
                </DropdownMenuItem>
              )}
              {sprint.status === "PLANNED" && onStart && (
                <DropdownMenuItem onClick={handleStart} disabled={isUpdating}>
                  <Play className="mr-2 size-4" aria-hidden="true" />
                  Start Sprint
                </DropdownMenuItem>
              )}
              {sprint.status === "ACTIVE" && onComplete && (
                <DropdownMenuItem onClick={handleComplete} disabled={isUpdating}>
                  <Square className="mr-2 size-4" aria-hidden="true" />
                  Complete Sprint
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/projects/${projectId}?sprint=${sprint.id}`}>View Board</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SprintFact icon={CalendarDays} label="Start Date">{format(startDate, "MMM dd, yyyy")}</SprintFact>
          <SprintFact icon={CalendarDays} label="End Date">{format(endDate, "MMM dd, yyyy")}</SprintFact>
          <SprintFact icon={Timer} label="Duration">{totalDays} days</SprintFact>
          <SprintFact
            icon={Gauge}
            label={sprint.status === "COMPLETED" ? "Completed" : "Remaining"}
            className={cn(sprint.status !== "COMPLETED" && daysRemaining < 0 && "text-danger-strong")}
          >
            {sprint.status === "COMPLETED"
              ? "Done"
              : daysRemaining < 0
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${daysRemaining} days`}
          </SprintFact>
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Progress: <span className="font-medium tabular-nums text-foreground">{completedPoints} / {totalPoints}</span> points
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ListChecks className="size-3.5" aria-hidden="true" />
              <span className="font-medium tabular-nums text-foreground">{doneTickets} / {tickets.length}</span> tickets
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} points`}
            aria-valuetext={`${Math.round(progress)}% complete`}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
