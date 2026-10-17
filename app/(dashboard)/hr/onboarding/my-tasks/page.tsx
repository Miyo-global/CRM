"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { OnboardingProgressRing } from "@/components/hr/onboarding-progress-ring";
import { OnboardingTaskCard } from "@/components/hr/onboarding-task-card";

import {
  useUserOnboarding,
  useCompleteOnboardingTask,
} from "@/lib/api/hooks/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";

function AllDoneBanner() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-success-soft px-6 py-8 text-center">
      <div>
        <p className="font-display text-lg font-bold text-success-strong">
          You have completed all onboarding tasks!
        </p>
        <p className="mt-1 text-sm text-success-strong">
          Welcome aboard — you are all set. Check back here if HR assigns new tasks.
        </p>
      </div>
      <CheckCircle2 className="size-5 text-success-strong motion-safe:animate-bounce" aria-hidden="true" />
    </div>
  );
}

export default function MyOnboardingTasksPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const { data: tasks, isLoading, isError, error, refetch } = useUserOnboarding(userId);
  const completeTask = useCompleteOnboardingTask();

  const togglingIds = useRef<Set<number>>(new Set());

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "COMPLETED").length ?? 0;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const allDone = totalTasks > 0 && completedTasks === totalTasks;

  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      toast.success("Congratulations! All onboarding tasks complete!", {
        description: "You are fully onboarded. Welcome to the team!",
        duration: 6000,
      });
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  const handleToggle = useCallback(
    (taskId: number, newStatus: "COMPLETED" | "PENDING") => {
      togglingIds.current.add(taskId);
      completeTask.mutate(
        { taskId, status: newStatus },
        {
          onSuccess: () => {
            togglingIds.current.delete(taskId);
          },
          onError: (e) => {
            togglingIds.current.delete(taskId);
            toast.error(getErrorMessage(e));
          },
        }
      );
    },
    [completeTask]
  );

  const sortedTasks = tasks
    ? [
        ...tasks.filter((t) => t.status !== "COMPLETED"),
        ...tasks.filter((t) => t.status === "COMPLETED"),
      ]
    : [];

  return (
    <PageWrapper
      title="My onboarding"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/onboarding">All Onboarding</Link>
        </Button>
      }
      contentClassName="mx-auto w-full max-w-3xl"
    >
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <Skeleton className="size-32 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      ) : totalTasks === 0 ? (
        <EmptyState
          title="No onboarding tasks yet"
          description="Your HR team hasn't set up any tasks for you. Check back soon."
        />
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col items-center gap-3 p-6">
            <OnboardingProgressRing percentage={percentage} size={128} strokeWidth={11} />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{completedTasks}</span> of{" "}
              <span className="font-semibold tabular-nums text-foreground">{totalTasks}</span> tasks completed
            </p>
          </Card>

          {allDone && <AllDoneBanner />}

          {!allDone && (
            <div className="space-y-2">
              {sortedTasks.map((task) => (
                <OnboardingTaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  isToggling={
                    completeTask.isPending && togglingIds.current.has(task.id)
                  }
                />
              ))}
            </div>
          )}

          {allDone && (
            <div className="space-y-2">
              {sortedTasks.map((task) => (
                <OnboardingTaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  isToggling={
                    completeTask.isPending && togglingIds.current.has(task.id)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
