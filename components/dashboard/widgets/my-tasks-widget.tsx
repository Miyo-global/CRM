"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { usePersonalDashboard } from "@/lib/api/hooks/dashboard";
import { ListChecks, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const priorityColors: Record<string, string> = {
  URGENT: "bg-danger-soft text-danger-strong border-danger-strong/25",
  HIGH: "bg-warning-soft text-warning-strong border-warning-strong/25",
  MEDIUM: "bg-warning-soft text-warning-strong border-warning-strong/25",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function MyTasksWidget() {
  const { data, isLoading, error } = usePersonalDashboard();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold">My Tasks</CardTitle>
        </div>
        <Link
          href="/projects"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          aria-label="View all tasks"
        >
          View all
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load tasks.</p>
        ) : !data?.myTasks.length ? (
          <EmptyState
            illustration={<EmptyTasksIllustration className="h-20 w-20" />}
            title="No pending tasks"
            description="You're all caught up."
            compact
          />
        ) : (
          <ul className="space-y-2 overflow-y-auto max-h-64">
            {data.myTasks.map((task) => {
              const isOverdue = task.dueDate
                ? new Date(task.dueDate) < new Date()
                : false;
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.projectName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {task.projectName}
                        </span>
                      )}
                      {task.priority && (
                        <span
                          className={cn(
                            "text-2xs font-semibold px-1.5 py-0.5 rounded border",
                            priorityColors[task.priority] ?? "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          className={cn(
                            "text-2xs font-medium",
                            isOverdue ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          {isOverdue ? "Overdue · " : "Due "}
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-2xs shrink-0">
                    {task.status.replace(/_/g, " ")}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
