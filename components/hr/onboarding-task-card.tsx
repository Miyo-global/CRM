"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { Tone } from "@/lib/design/tones";
import { Checkbox } from "@/components/ui/checkbox";
import type { OnboardingTask } from "@/lib/api/hooks/hr/onboarding";


export interface OnboardingTaskCardProps {
  task: OnboardingTask;
  onToggle: (taskId: number, newStatus: "COMPLETED" | "PENDING") => void;
  isToggling: boolean;
}


function ownerTone(ownerRole: string): Tone {
  switch (ownerRole.toUpperCase()) {
    case "NEW_HIRE":
      return "info";
    case "IT":
      return "plum";
    case "HR":
      return "warning";
    case "MANAGER":
      return "success";
    default:
      return "neutral";
  }
}

function ownerBadgeLabel(ownerRole: string): string {
  switch (ownerRole.toUpperCase()) {
    case "NEW_HIRE":
      return "You";
    case "IT":
      return "IT";
    case "HR":
      return "HR";
    case "MANAGER":
      return "Manager";
    default:
      return ownerRole;
  }
}

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
      overdue: true,
    };
  } else if (diffDays === 0) {
    return { label: "Due today", overdue: false };
  } else if (diffDays === 1) {
    return { label: "Due tomorrow", overdue: false };
  } else {
    return {
      label: `Due in ${diffDays} days`,
      overdue: false,
    };
  }
}


export function OnboardingTaskCard({ task, onToggle, isToggling }: OnboardingTaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "COMPLETED";

  const handleToggle = useCallback(() => {
    onToggle(task.id, isCompleted ? "PENDING" : "COMPLETED");
  }, [task.id, isCompleted, onToggle]);

  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <Card
      className={cn(
        "transition-opacity duration-200",
        isCompleted && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label={isCompleted ? `Mark "${task.title}" as pending` : `Complete "${task.title}"`}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </p>

              <StatusPill tone={ownerTone(task.ownerRole)}>
                {ownerBadgeLabel(task.ownerRole)}
              </StatusPill>
            </div>

            {dueInfo && (
              <p
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  dueInfo.overdue && !isCompleted
                    ? "font-medium text-danger-strong"
                    : "text-muted-foreground"
                )}
              >
                {dueInfo.label}
              </p>
            )}

            {task.description && (
              <div className="mt-1">
                {expanded ? (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {task.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpanded(false)}
                      className="mt-1 inline-flex items-center gap-0.5 rounded-xs text-xs text-brand-text hover:underline focus-visible:focus-ring"
                      aria-label="Collapse description"
                    >
                      <ChevronUp className="size-3" aria-hidden="true" />
                      Less
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="mt-0.5 inline-flex items-center gap-0.5 rounded-xs text-xs text-brand-text hover:underline focus-visible:focus-ring"
                    aria-label="Expand description"
                  >
                    <ChevronDown className="size-3" aria-hidden="true" />
                    Details
                  </button>
                )}
              </div>
            )}
          </div>

          {isCompleted && (
            <StatusPill tone="success" dot>
              Done
            </StatusPill>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
