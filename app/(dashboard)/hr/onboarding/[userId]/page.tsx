"use client";

import { use, useCallback, memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { DetailLayout } from "@/components/shared/detail-header";
import { PropertyList } from "@/components/shared/property-list";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";

import { useSession } from "next-auth/react";
import { useUserOnboarding, useCompleteOnboardingTask } from "@/lib/api/hooks/hr/onboarding";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayIST, normalizeDeadlineDate } from "@/lib/hr/application-dates";
import { formatDisplayDate } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";


function ownerRoleTone(role: string): Tone {
  switch (role) {
    case "NEW_HIRE":
      return "brand";
    case "HR":
      return "info";
    default:
      return "neutral";
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
          stroke="var(--ink-200)"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--gold-400)"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontWeight="800"
          fill="currentColor"
          className="font-display text-lg tabular-nums"
        >
          {percent}%
        </text>
      </svg>
      <p className="text-sm tabular-nums text-muted-foreground">
        {completed} of {pluralise(total, "task")} done
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
  const { data: session } = useSession();
  const isOwnChecklist = session?.user?.id === userId;
  const { data: tasks, isLoading, isError, error, refetch } = useUserOnboarding(userId);
  // Someone else's checklist is named, so an admin is not told to finish their
  // own onboarding (A23).
  const { data: employeesRaw } = useHrEmployees(undefined, { enabled: !isOwnChecklist });
  const employeeName = (() => {
    if (isOwnChecklist) return null;
    const list = (Array.isArray(employeesRaw)
      ? employeesRaw
      : (employeesRaw as { data?: Employee[] } | undefined)?.data ?? []) as Employee[];
    const match = list.find((e) => e.id === userId);
    if (!match) return null;
    return `${match.firstName ?? ""} ${match.lastName ?? ""}`.trim() || match.email || null;
  })();
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
      title="Onboarding checklist"
      subtitle={
        isOwnChecklist
          ? "Complete each task to finish your onboarding."
          : employeeName
            ? `Onboarding tasks for ${employeeName}`
            : "Onboarding tasks for this employee"
      }
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/onboarding">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="order-first h-64 rounded-lg lg:order-none" />
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : taskList.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Onboarding hasn't been initiated for this employee yet."
          compact
        />
      ) : (
        <DetailLayout
          rail={
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="font-sans text-sm font-semibold">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <div className="flex justify-center">
                    <ProgressRing percent={percent} completed={completed} total={total} />
                  </div>
                  <PropertyList
                    items={[
                      { label: "Completed", value: <span className="tabular-nums">{completed}</span> },
                      { label: "Remaining", value: <span className="tabular-nums">{total - completed}</span> },
                      { label: "Total tasks", value: <span className="tabular-nums">{total}</span> },
                    ]}
                  />
                </CardContent>
              </Card>
              {allDone && (
                <div className="rounded-lg bg-success-soft px-4 py-3 text-center">
                  <p className="font-display text-lg font-bold text-success-strong">
                    All done!
                  </p>
                  <p className="text-sm text-success-strong mt-0.5">
                    Onboarding complete. Welcome to the team!
                  </p>
                </div>
              )}
            </>
          }
          main={
          <div className="space-y-2">
            {taskList.map((task) => {
              const done = task.status === "COMPLETED";
              const overdue = !done && isOverdue(task.dueDate);

              return (
                <Card
                  key={task.id}
                  className={done ? "opacity-70" : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={completeTask.isPending}
                        aria-label={done ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as complete`}
                        className="shrink-0 rounded-full transition-opacity hover:opacity-75 focus-visible:focus-ring disabled:opacity-50"
                      >
                        {done ? (
                          <CheckCircle2 className="size-5 text-success-strong" aria-hidden="true" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          <StatusPill tone={ownerRoleTone(task.ownerRole)}>
                            {task.ownerRole.replace("_", " ")}
                          </StatusPill>
                          {overdue && (
                            <StatusPill tone="danger" dot>
                              Overdue
                            </StatusPill>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                              {overdue ? (
                                <AlertCircle className="size-3.5 text-danger-strong" aria-hidden="true" />
                              ) : (
                                <Clock className="size-3.5" aria-hidden="true" />
                              )}
                              Due {formatDate(task.dueDate)}
                            </span>
                          )}
                          {done && task.completedAt && (
                            <span className="text-xs tabular-nums text-success-strong">
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
          }
        />
      )}
    </PageWrapper>
  );
}
