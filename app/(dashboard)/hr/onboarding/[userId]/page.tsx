"use client";

import { use, useCallback, memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import { useUserOnboarding, useCompleteOnboardingTask } from "@/lib/api/hooks/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayIST, normalizeDeadlineDate } from "@/lib/careers/application-deadline";
import { formatDisplayDate } from "@/lib/date-utils";


function ownerRoleVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "NEW_HIRE":
      return "default";
    case "HR":
      return "secondary";
    default:
      return "outline";
  }
}

function isOverdue(dueDate: string | null): boolean {
  const normalized = normalizeDeadlineDate(dueDate);
  if (!normalized) return false;
  return normalized < getTodayIST();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return formatDisplayDate(dateStr, { day: "numeric", month: "short", year: "numeric" }) || "";
}


function ProgressRing({
  percent,
  completed,
  total,
}: {
  percent: number;
  completed: number;
  total: number;
}) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`${percent}% complete`}>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={percent === 100 ? "hsl(142 71% 45%)" : "hsl(var(--primary))"}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="currentColor"
        >
          {percent}%
        </text>
      </svg>
      <p className="text-sm text-muted-foreground">
        {completed} of {total} tasks done
      </p>
    </div>
  );
}


export default function UserOnboardingPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data: tasks, isLoading } = useUserOnboarding(userId);
  const completeTask = useCompleteOnboardingTask();

  const handleToggle = useCallback(
    (taskId: number, currentStatus: string) => {
      const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
      completeTask.mutate(
        { taskId, status: newStatus },
        {
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [completeTask]
  );

  const taskList = tasks ?? [];
  const completed = taskList.filter((t) => t.status === "COMPLETED").length;
  const total = taskList.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  return (
    <PageWrapper
      title="Onboarding Checklist"
      subtitle="Complete each task to finish your onboarding."
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/onboarding">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-center py-4">
            <Skeleton className="h-28 w-28 rounded-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : taskList.length === 0 ? (
        <EmptyState
          illustration={<EmptyTasksIllustration className="h-24 w-24" />}
          title="No tasks yet"
          description="Onboarding hasn't been initiated for this employee yet."
          compact
        />
      ) : (
        <div className="space-y-5">
          <div className="flex justify-center py-2">
            <ProgressRing percent={percent} completed={completed} total={total} />
          </div>

          {allDone && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-4 py-3 text-center">
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                All done!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                Onboarding complete. Welcome to the team!
              </p>
            </div>
          )}

          <div className="space-y-2">
            {taskList.map((task) => {
              const done = task.status === "COMPLETED";
              const overdue = !done && isOverdue(task.dueDate);

              return (
                <Card
                  key={task.id}
                  className={done ? "opacity-70" : undefined}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={completeTask.isPending}
                        aria-label={done ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as complete`}
                        className="mt-0.5 shrink-0 transition-opacity hover:opacity-75 disabled:opacity-50"
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <Badge
                            variant={ownerRoleVariant(task.ownerRole)}
                            className="text-[9px] py-0 h-4 shrink-0"
                          >
                            {task.ownerRole.replace("_", " ")}
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-[9px] py-0 h-4 shrink-0">
                              Overdue
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[12px] text-muted-foreground">{task.description}</p>
                        )}

                        <div className="flex items-center gap-3 mt-1">
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              {overdue ? (
                                <AlertCircle className="h-3 w-3 text-destructive" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              Due {formatDate(task.dueDate)}
                            </span>
                          )}
                          {done && task.completedAt && (
                            <span className="text-[11px] text-green-600 dark:text-green-400">
                              Completed {formatDate(task.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
