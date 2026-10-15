"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/design/tones";
import { format } from "date-fns";

const MAX_ROWS = 6;

const priorityTone: Record<string, Tone> = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "brand",
  LOW: "neutral",
};

const statusTone = (status: string): Tone =>
  status === "DONE" ? "success" : status === "IN_PROGRESS" || status === "IN_REVIEW" ? "info" : "neutral";

export function MyTasksWidget() {
  const { data, isLoading, error, refetch } = usePersonalDashboard();
  const tasks = data?.myTasks ?? [];

  return (
    <WidgetCard
      title="My Tasks"
      icon={ListChecks}
      tone="info"
      count={tasks.length || undefined}
      actions={<ViewAllLink href="/projects" ariaLabel="View all tasks" />}
    >
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !tasks.length ? (
        <EmptyState
          title="No pending tasks"
          description="You're all caught up."
          compact
        />
      ) : (
        <ul className="-mx-2">
          {tasks.slice(0, MAX_ROWS).map((task) => {
            const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() : false;
            const tone = task.priority ? priorityTone[task.priority] ?? "neutral" : null;
            return (
              <li key={task.id}>
                <WidgetListRow
                  leading={
                    <span
                      className={cn("size-2 rounded-full", tone ? toneDot[tone] : "bg-border-strong")}
                      aria-hidden="true"
                    />
                  }
                  title={task.title}
                  meta={
                    <>
                      {task.projectName}
                      {task.projectName && (task.priority || task.dueDate) ? " · " : ""}
                      {task.priority}
                      {task.priority && task.dueDate ? " · " : ""}
                      {task.dueDate && (
                        <span className={cn("tabular-nums", isOverdue && "font-medium text-destructive")}>
                          {isOverdue ? "Overdue · " : "Due "}
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </>
                  }
                  trailing={<StatusPill tone={statusTone(task.status)}>{task.status.replace(/_/g, " ")}</StatusPill>}
                />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
