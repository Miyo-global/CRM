"use client";

import { useResignationProgress } from "@/lib/api/hooks/hr";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center gap-1 px-4 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded-full" />
        ))}
      </div>
    );
  }

  const steps = data?.steps ?? PROGRESS_STEPS.map((s, i) => ({
    ...s,
    status: i === 0 ? ("current" as const) : ("pending" as const),
  }));

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label ?? i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-colors",
                  step.status === "completed"
                    ? "bg-primary border-primary"
                    : step.status === "rejected"
                    ? "bg-destructive border-destructive"
                    : step.status === "current" || step.status === "active"
                    ? "bg-background border-primary ring-2 ring-primary/30"
                    : "bg-background border-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-[9px] text-center leading-tight max-w-[52px]",
                  step.status === "completed"
                    ? "text-primary font-medium"
                    : step.status === "current" || step.status === "active"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.status === "completed" && step.timestamp && (
                <span className="text-[8px] text-muted-foreground">
                  {format(new Date(step.timestamp), "MMM d")}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 mb-4",
                  step.status === "completed" ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
