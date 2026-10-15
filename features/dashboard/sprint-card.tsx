"use client";

import { memo } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink } from "@/components/dashboard/widgets/view-all-link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { sprintStatusColors } from "@/lib/theme-constants";

const SPRINT_DANGER_DAYS = 2;

interface SprintSummary {
  projectId?: number;
  name: string;
  projectName: string;
  progress: number;
  daysRemaining: number;
  completedPoints: number;
  totalPoints: number;
  doneTickets: number;
  inProgressTickets: number;
  todoTickets: number;
}

interface SprintCardProps {
  summary: SprintSummary | undefined;
  isLoading: boolean;
}

export const SprintCard = memo(function SprintCard({ summary, isLoading }: SprintCardProps) {
  const urgent = summary ? summary.daysRemaining <= SPRINT_DANGER_DAYS : false;
  return (
    <WidgetCard
      title="Active Sprint"
      icon={Zap}
      actions={summary?.projectId && <ViewAllLink href={`/projects/${summary.projectId}`} ariaLabel="View sprint project" />}
    >
      <div aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div>
              <h4 className="truncate font-sans text-base font-semibold text-foreground">{summary.name}</h4>
              <p className="truncate text-sm text-muted-foreground">{summary.projectName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold tabular-nums text-foreground">{summary.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={summary.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Sprint progress" aria-valuetext={`${summary.progress}% complete — ${summary.completedPoints} of ${summary.totalPoints} points`}>
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, summary.progress))}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div className={cn("rounded-md p-3", urgent ? "bg-danger-soft" : "bg-surface-sunken/60")}>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  Days Left
                  {urgent && <AlertTriangle className="size-3 text-danger-strong" aria-hidden="true" />}
                </dt>
                <dd className={cn("font-display text-xl font-bold tabular-nums", urgent ? "text-danger-strong" : "text-foreground")}>
                  {summary.daysRemaining}
                  {urgent && <span className="ml-1 font-sans text-xs font-medium">Urgent</span>}
                </dd>
              </div>
              <div className="rounded-md bg-surface-sunken/60 p-3">
                <dt className="text-xs text-muted-foreground">Points</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-foreground">
                  {summary.completedPoints}/{summary.totalPoints}
                </dd>
              </div>
            </dl>

            <dl className="space-y-2 text-sm">
              {[
                { label: "Done", value: summary.doneTickets, dot: sprintStatusColors.done },
                { label: "In Progress", value: summary.inProgressTickets, dot: sprintStatusColors.inProgress },
                { label: "To Do", value: summary.todoTickets, dot: sprintStatusColors.todo },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", row.dot)} aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className="font-medium tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <EmptyState
            compact
            title="No active sprint"
            description="Start a sprint in your project to see progress here."
          />
        )}
      </div>
    </WidgetCard>
  );
});
