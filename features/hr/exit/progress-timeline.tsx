"use client";

import { useResignationProgress } from "@/lib/api/hooks/hr";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock, X } from "lucide-react";
import { IconChip } from "@/components/ui/icon-chip";
import type { Tone } from "@/lib/design/tones";

const PROGRESS_STEPS = [
  { step: "SUBMITTED", label: "Submitted" },
  { step: "PENDING_HR", label: "HR Review" },
  { step: "HR_APPROVED", label: "HR Approved" },
  { step: "CEO_APPROVED", label: "CEO Approved" },
  { step: "COMPLETED", label: "Completed" },
];

export function ProgressTimeline({ id }: { id: number }) {
  const { data, isLoading } = useResignationProgress(id, true);

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const steps = data?.steps ?? PROGRESS_STEPS.map((s, i) => ({
    ...s,
    status: i === 0 ? ("current" as const) : ("pending" as const),
  }));

  // §6.3 timeline: 1px border line, 28px icon-chip nodes.
  return (
    <ol className="relative space-y-3 px-4 py-3 before:absolute before:top-6.5 before:bottom-6.5 before:left-7.5 before:w-px before:-translate-x-1/2 before:bg-border">
      {steps.map((step, i) => {
        const isCurrent = step.status === "current" || step.status === "active";
        const node: { icon: typeof Check; tone: Tone } =
          step.status === "completed"
            ? { icon: Check, tone: "success" }
            : step.status === "rejected"
            ? { icon: X, tone: "danger" }
            : isCurrent
            ? { icon: Clock, tone: "brand" }
            : { icon: Circle, tone: "neutral" };
        return (
          <li
            key={step.label ?? i}
            className="relative flex items-center gap-3"
            aria-current={isCurrent ? "step" : undefined}
          >
            <IconChip
              icon={node.icon}
              tone={node.tone}
              size="sm"
              className={cn("relative ring-4 ring-surface-sunken", isCurrent && "ring-gold-300")}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span
                className={cn(
                  step.status === "completed" || isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.status === "completed" && step.timestamp && (
                <time
                  dateTime={new Date(step.timestamp).toISOString()}
                  title={format(new Date(step.timestamp), "PPpp")}
                  className="text-xs tabular-nums text-muted-foreground"
                >
                  {format(new Date(step.timestamp), "MMM d")}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
